import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import * as buildHelpers from "../src/buildHelpers";

var defaultLibFilename = path.join(path.dirname(path.resolve(require.resolve("typescript"))), "lib.es6.d.ts");
var defaultLibFilenameNorm = defaultLibFilename.replace(/\\/g, "/");

var lastLibPrecompiled;

function createCompilerHost(currentDirectory) {
    function getCanonicalFileName(fileName) {
        return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
    }
    function getSourceFile(filename, languageVersion, onError) {
        if (filename === defaultLibFilenameNorm && lastLibPrecompiled) {
            return lastLibPrecompiled;
        }
        var text = fs.readFileSync(filename === defaultLibFilenameNorm ? defaultLibFilename : path.resolve(currentDirectory, filename)).toString();
        if (filename === defaultLibFilenameNorm) {
            lastLibPrecompiled = ts.createSourceFile(filename, text, languageVersion, true);
            return lastLibPrecompiled;
        }
        return ts.createSourceFile(filename, text, languageVersion, true);
    }
    function writeFile(fileName, data, writeByteOrderMark, onError) {
        fileName = path.join(currentDirectory, fileName);
        try {
            var text = ts.sys.readFile(fileName, 'utf-8');
        } catch (e) {
            text = "";
        }
        if (text === data) {
            fs.utimesSync(fileName, new Date(), new Date());
            return;
        }
        try {
            ts.sys.writeFile(fileName, data, false);
        } catch (e) {
            if (onError) {
                onError(e.message);
            }
        }
    }
    return {
        getSourceFile: getSourceFile,
        getDefaultLibFileName: function(options) { return defaultLibFilename; },
        writeFile: writeFile,
        getCurrentDirectory: function() { return currentDirectory; },
        useCaseSensitiveFileNames: function() { return ts.sys.useCaseSensitiveFileNames; },
        getCanonicalFileName: getCanonicalFileName,
        getNewLine: function() { return '\n'; }
    };
}

function reportDiagnostic(diagnostic) {
    var output = "";
    if (diagnostic.file) {
        var loc = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        output += diagnostic.file.fileName + "(" + loc.line + "," + loc.character + "): ";
    }
    var category = ts.DiagnosticCategory[diagnostic.category].toLowerCase();
    output += category + " TS" + diagnostic.code + ": " + diagnostic.messageText + ts.sys.newLine;
    ts.sys.write(output);
}

function reportDiagnostics(diagnostics) {
    for (var i = 0; i < diagnostics.length; i++) {
        reportDiagnostic(diagnostics[i]);
    }
}

describe("gatherInfoComplex", () => {
    it("works", () => {
        let testpath = path.join(__dirname, "complexGatherInfo");
        var full = testpath;
        var program = ts.createProgram(["main.ts"], { module: ts.ModuleKind.CommonJS }, createCompilerHost(full));
        var diagnostics = program.getSyntacticDiagnostics();
        reportDiagnostics(diagnostics);
        if (diagnostics.length === 0) {
            var diagnostics = program.getGlobalDiagnostics();
            reportDiagnostics(diagnostics);
            if (diagnostics.length === 0) {
                var diagnostics = program.getSemanticDiagnostics();
                reportDiagnostics(diagnostics);
            }
        }
        var tc = program.getTypeChecker();
        var sourceFiles = program.getSourceFiles();
        for (let i = 0; i < sourceFiles.length; i++) {
            var src = sourceFiles[i];
            if (src.hasNoDefaultLib) continue; // skip searching default lib
            var srcInfo = buildHelpers.gatherSourceInfo(src, tc, (nn: ts.StringLiteral) => path.join(path.dirname(nn.getSourceFile().fileName), nn.text));
            //console.log(src.fileName);
            //console.log(srcInfo);
            if (srcInfo.sprites.length > 0) {
                for (let i = 0; i < srcInfo.sprites.length; i++) {
                    var si = srcInfo.sprites[i];
                    buildHelpers.setArgument(si.callExpression, 0, si.name || "Error");
                    buildHelpers.setArgument(si.callExpression, 1, i);
                }
                program.emit(src);
            }
        }
    });
    it("wip", (done) => {
        buildHelpers.compile(done);
    });
});
