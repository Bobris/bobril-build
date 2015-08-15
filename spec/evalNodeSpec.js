var ts = require("typescript");
var fs = require("fs");
var path = require("path");
var evalNode_1 = require("../src/evalNode");
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
        try {
            var text = fs.readFileSync(filename === defaultLibFilenameNorm ? defaultLibFilename : path.resolve(currentDirectory, filename)).toString();
        }
        catch (e) {
            return null;
        }
        if (filename === defaultLibFilenameNorm) {
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
    return {
        getSourceFile: getSourceFile,
        getDefaultLibFileName: function (options) { return defaultLibFilename; },
        writeFile: writeFile,
        getCurrentDirectory: function () { return currentDirectory; },
        useCaseSensitiveFileNames: function () { return ts.sys.useCaseSensitiveFileNames; },
        getCanonicalFileName: getCanonicalFileName,
        getNewLine: function () { return '\n'; }
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
describe("evalNode", function () {
    var testpath = path.join(__dirname, "evalNode");
    var di = fs.readdirSync(testpath).sort();
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
    di.forEach(function (n) {
        if (n[0] === ".")
            return;
        if (n[0] === "_")
            return;
        it(n, function () {
            var full = path.join(testpath, n);
            var program = ts.createProgram(["main.ts"], { module: 1 /* CommonJS */ }, createCompilerHost(full));
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
            var accc = "";
            var tc = program.getTypeChecker();
            var mainsource = program.getSourceFile("main.ts");
            function visit(n) {
                if (n.kind === 166 /* CallExpression */) {
                    var ce = n;
                    if (ce.expression.getText() === "console.log") {
                        if (ce.arguments.length === 1) {
                            var res = evalNode_1.evalNode(ce.arguments[0], tc, null);
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
            var expc = "";
            try {
                expc = fs.readFileSync(path.join(testpath, "_expected", n + ".txt")).toString();
            }
            catch (err) {
                expc = "New Test";
            }
            expect(accc).toEqual(expc);
        });
    });
});
