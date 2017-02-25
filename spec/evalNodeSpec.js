"use strict";
const ts = require("typescript");
const fs = require("fs");
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everywhere, just use forward slashes
const evalNode_1 = require("../dist/evalNode");
var defaultLibFilename = path.join(path.dirname(require.resolve("typescript").replace(/\\/g, "/")), "lib.es6.d.ts");
var lastLibPrecompiled;
function createCompilerHost(currentDirectory) {
    function getCanonicalFileName(fileName) {
        return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
    }
    function getSourceFile(filename, languageVersion, onError) {
        if (filename === defaultLibFilename && lastLibPrecompiled) {
            return lastLibPrecompiled;
        }
        try {
            var text = fs.readFileSync(filename === defaultLibFilename ? defaultLibFilename : path.join(currentDirectory, filename)).toString();
        }
        catch (e) {
            return null;
        }
        if (filename === defaultLibFilename) {
            lastLibPrecompiled = ts.createSourceFile(filename, text, languageVersion, true);
            return lastLibPrecompiled;
        }
        return ts.createSourceFile(filename, text, languageVersion, true);
    }
    function writeFile(fileName, data, writeByteOrderMark, onError) {
        try {
            var text = ts.sys.readFile(fileName, 'utf-8');
        }
        catch (e) {
            text = "";
        }
        if (text === data) {
            fs.utimesSync(fileName, new Date(), new Date());
            return;
        }
        try {
            console.log("Writing " + fileName);
            ts.sys.writeFile(fileName, data, false);
        }
        catch (e) {
            if (onError) {
                onError(e.message);
            }
        }
    }
    function resolveModuleName(moduleName, containingFile) {
        if (moduleName.substr(0, 1) === '.') {
            let res = moduleName + ".ts";
            return { resolvedFileName: res };
        }
        return null;
    }
    return {
        getSourceFile: getSourceFile,
        getDefaultLibFileName: function (options) { return defaultLibFilename; },
        writeFile: writeFile,
        getCurrentDirectory: function () { return currentDirectory; },
        useCaseSensitiveFileNames: function () { return ts.sys.useCaseSensitiveFileNames; },
        getCanonicalFileName: getCanonicalFileName,
        getNewLine: function () { return '\n'; },
        getDirectories: () => [],
        fileExists(fileName) {
            try {
                return fs.statSync(path.join(currentDirectory, fileName)).isFile();
            }
            catch (e) {
                return false;
            }
        },
        readFile(fileName) {
            return fs.readFileSync(path.join(currentDirectory, fileName)).toString();
        },
        resolveModuleNames(moduleNames, containingFile) {
            return moduleNames.map((n) => {
                let r = resolveModuleName(n, containingFile);
                //console.log(n, containingFile, r);
                return r;
            });
        }
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
const specdirname = path.join(__dirname.replace(/\\/g, "/"), "../spec");
describe("evalNode", () => {
    let testpath = path.join(specdirname, "evalNode");
    let di = fs.readdirSync(testpath).sort();
    try {
        fs.mkdirSync(path.join(testpath, "_accept"));
    }
    catch (err) { }
    ;
    try {
        fs.mkdirSync(path.join(testpath, "_expected"));
    }
    catch (err) { }
    ;
    di.forEach(n => {
        if (n[0] === ".")
            return;
        if (n[0] === "_")
            return;
        it(n, () => {
            var full = path.join(testpath, n);
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
            let accc = "";
            var tc = program.getTypeChecker();
            var mainsource = program.getSourceFile("main.ts");
            function visit(n) {
                if (n.kind === ts.SyntaxKind.CallExpression) {
                    var ce = n;
                    if (ce.expression.getText() === "console.log") {
                        if (ce.arguments.length === 1) {
                            let res = evalNode_1.evalNode(ce.arguments[0], tc, null);
                            if (res === undefined)
                                res = "undefined";
                            if (typeof res === "object")
                                res = JSON.stringify(res);
                            accc += res + "\n";
                        }
                    }
                }
                //console.log((<any>ts).SyntaxKind[n.kind] + " -> " + n.getText());
                ts.forEachChild(n, visit);
            }
            visit(mainsource);
            fs.writeFileSync(path.join(testpath, "_accept", n + ".txt"), accc);
            let expc = "";
            try {
                expc = fs.readFileSync(path.join(testpath, "_expected", n + ".txt")).toString();
            }
            catch (err) {
                expc = "New Test";
            }
            expc = expc.replace(/\r\n/g, '\n');
            accc = accc.replace(/\r\n/g, '\n');
            expect(accc).toEqual(expc);
        });
    });
});
//# sourceMappingURL=evalNodeSpec.js.map