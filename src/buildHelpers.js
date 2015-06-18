var ts = require("typescript");
var fs = require("fs");
var path = require("path");
var evalNode = require("./evalNode");
var spriter = require("./spriter");
var imageOps = require("./imageOps");
function gatherSourceInfo(source, tc) {
    var result = { sprites: [] };
    function visit(n) {
        if (n.kind === 157 /* CallExpression */) {
            var ce = n;
            if (ce.expression.getText() === "b.sprite") {
                var si = { callExpression: ce };
                for (var i = 0; i < ce.arguments.length; i++) {
                    var res = evalNode.evalNode(ce.arguments[i], tc, i === 0); // first argument is path
                    if (res !== undefined)
                        switch (i) {
                            case 0:
                                if (typeof res === "string")
                                    si.name = res;
                                break;
                            case 1:
                                if (typeof res === "string")
                                    si.color = res;
                                break;
                            case 2:
                                if (typeof res === "number")
                                    si.width = res;
                                break;
                            case 3:
                                if (typeof res === "number")
                                    si.height = res;
                                break;
                            case 4:
                                if (typeof res === "number")
                                    si.x = res;
                                break;
                            case 5:
                                if (typeof res === "number")
                                    si.y = res;
                                break;
                            default: throw new Error("b.sprite cannot have more than 6 parameters");
                        }
                }
                result.sprites.push(si);
            }
        }
        ts.forEachChild(n, visit);
    }
    visit(source);
    return result;
}
exports.gatherSourceInfo = gatherSourceInfo;
function createNodeFromValue(value) {
    if (value === null) {
        var nullNode = ts.createNode(89 /* NullKeyword */);
        nullNode.pos = -1;
        return nullNode;
    }
    if (value === true) {
        var result = ts.createNode(95 /* TrueKeyword */);
        result.pos = -1;
        return result;
    }
    if (value === false) {
        var result = ts.createNode(80 /* FalseKeyword */);
        result.pos = -1;
        return result;
    }
    if (typeof value === "string") {
        var result = ts.createNode(8 /* StringLiteral */);
        result.pos = -1;
        result.text = value;
        return result;
    }
    if (typeof value === "number") {
        var result = ts.createNode(7 /* NumericLiteral */);
        result.pos = -1;
        result.text = "" + value;
        return result;
    }
    throw new Error("Don't know how to create node for " + value);
}
function setArgument(callExpression, index, value) {
    while (callExpression.arguments.length < index) {
        callExpression.arguments.push(createNodeFromValue(null));
    }
    if (callExpression.arguments.length === index) {
        callExpression.arguments.push(createNodeFromValue(value));
    }
    else {
        callExpression.arguments[index] = createNodeFromValue(value);
    }
}
exports.setArgument = setArgument;
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
        console.log("Writing " + fileName);
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
function compile(done) {
    var full = "c:/Research/bobrilapp";
    var program = ts.createProgram(["app.ts"], { module: 1 /* CommonJS */ }, createCompilerHost(full));
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
    var prom = Promise.resolve(null);
    var spriteMap = Object.create(null);
    for (var i = 0; i < sourceFiles.length; i++) {
        var src = sourceFiles[i];
        if (src.hasNoDefaultLib)
            continue; // skip searching default lib
        var srcInfo = gatherSourceInfo(src, tc);
        //console.log(src.fileName);
        //console.log(srcInfo);
        if (srcInfo.sprites.length > 0) {
            for (var i_1 = 0; i_1 < srcInfo.sprites.length; i_1++) {
                var si = srcInfo.sprites[i_1];
                (function (name) {
                    prom = prom.then(function () {
                        return imageOps.loadPNG(path.join(full, name)).then(function (img) {
                            spriteMap[name] = img;
                        });
                    });
                })(si.name);
            }
        }
    }
    prom = prom.then(function () {
        var spList = [];
        for (var i = 0; i < sourceFiles.length; i++) {
            var src = sourceFiles[i];
            if (src.hasNoDefaultLib)
                continue; // skip searching default lib
            var srcInfo = gatherSourceInfo(src, tc);
            if (srcInfo.sprites.length > 0) {
                for (var i_2 = 0; i_2 < srcInfo.sprites.length; i_2++) {
                    var si = srcInfo.sprites[i_2];
                    spList.push({
                        width: spriteMap[si.name].width,
                        height: spriteMap[si.name].height, x: 0, y: 0, img: spriteMap[si.name], name: si.name
                    });
                }
            }
        }
        var dim = spriter.spritePlace(spList);
        var bundleImage = imageOps.createImage(dim[0], dim[1]);
        for (var i = 0; i < spList.length; i++) {
            var sp = spList[i];
            imageOps.drawImage(sp.img, bundleImage, sp.x, sp.y);
        }
        imageOps.savePNG(bundleImage, path.join(full, "bundle.png"));
        for (var i = 0; i < sourceFiles.length; i++) {
            var src = sourceFiles[i];
            if (src.hasNoDefaultLib)
                continue; // skip searching default lib
            var srcInfo = gatherSourceInfo(src, tc);
            if (srcInfo.sprites.length > 0) {
                for (var i_3 = 0; i_3 < srcInfo.sprites.length; i_3++) {
                    var si = srcInfo.sprites[i_3];
                    for (var j = 0; j < spList.length; j++) {
                        if (spList[j].name === si.name) {
                            setArgument(si.callExpression, 0, "bundle.png");
                            setArgument(si.callExpression, 1, null);
                            setArgument(si.callExpression, 2, spList[j].width);
                            setArgument(si.callExpression, 3, spList[j].height);
                            setArgument(si.callExpression, 4, spList[j].x);
                            setArgument(si.callExpression, 5, spList[j].y);
                        }
                    }
                }
            }
            program.emit(src);
        }
    }).then(done);
}
exports.compile = compile;
