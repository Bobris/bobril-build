var ts = require("typescript");
var fs = require("fs");
var path = require("path");
var evalNode = require("./evalNode");
var imageOps = require("./imageOps");
var imgCache = require("./imgCache");
function isBobrilFunction(name, callExpression, sourceInfo) {
    return callExpression.expression.getText() === sourceInfo.bobrilNamespace + '.' + name;
}
function gatherSourceInfo(source, tc, resolvePathStringLiteral) {
    var result = { sourceFile: source, sourceDeps: [], bobrilNamespace: null, sprites: [], styleDefs: [], trs: [] };
    function visit(n) {
        if (n.kind === 209 /* ImportDeclaration */) {
            var id = n;
            var moduleSymbol = tc.getSymbolAtLocation(id.moduleSpecifier);
            var sf = moduleSymbol.valueDeclaration.getSourceFile();
            var fn = sf.fileName;
            // bobril import is detected that filename contains bobril and content contains sprite export
            if (result.bobrilNamespace == null && id.importClause.namedBindings.kind === 211 /* NamespaceImport */ && /bobril/i.test(fn) && moduleSymbol.exports["sprite"] != null) {
                result.bobrilNamespace = id.importClause.namedBindings.name.text;
            }
            result.sourceDeps.push(fn);
        }
        else if (n.kind === 215 /* ExportDeclaration */) {
            var ed = n;
            if (ed.moduleSpecifier) {
                var moduleSymbol = tc.getSymbolAtLocation(ed.moduleSpecifier);
                result.sourceDeps.push(moduleSymbol.valueDeclaration.getSourceFile().fileName);
            }
        }
        else if (n.kind === 157 /* CallExpression */) {
            var ce = n;
            if (isBobrilFunction('sprite', ce, result)) {
                var si = { callExpression: ce };
                for (var i = 0; i < ce.arguments.length; i++) {
                    var res = evalNode.evalNode(ce.arguments[i], tc, i === 0 ? resolvePathStringLiteral : null); // first argument is path
                    if (res !== undefined)
                        switch (i) {
                            case 0:
                                if (typeof res === 'string')
                                    si.name = res;
                                break;
                            case 1:
                                if (typeof res === 'string')
                                    si.color = res;
                                break;
                            case 2:
                                if (typeof res === 'number')
                                    si.width = res;
                                break;
                            case 3:
                                if (typeof res === 'number')
                                    si.height = res;
                                break;
                            case 4:
                                if (typeof res === 'number')
                                    si.x = res;
                                break;
                            case 5:
                                if (typeof res === 'number')
                                    si.y = res;
                                break;
                            default: throw new Error('b.sprite cannot have more than 6 parameters');
                        }
                }
                result.sprites.push(si);
            }
            else if (isBobrilFunction('styleDef', ce, result) || isBobrilFunction('styleDefEx', ce, result)) {
                var item = { callExpression: ce, isEx: isBobrilFunction('styleDefEx', ce, result) };
                if (ce.arguments.length == 3 + (item.isEx ? 1 : 0)) {
                    item.name = evalNode.evalNode(ce.arguments[ce.arguments.length - 1], tc, null);
                }
                else {
                    if (ce.parent.kind === 198 /* VariableDeclaration */) {
                        var vd = ce.parent;
                        item.name = vd.name.text;
                    }
                    else if (ce.parent.kind === 169 /* BinaryExpression */) {
                        var be = ce.parent;
                        if (be.operatorToken.kind === 53 /* FirstAssignment */ && be.left.kind === 65 /* Identifier */) {
                            item.name = be.left.text;
                        }
                    }
                }
                result.styleDefs.push(item);
            }
            else if (isBobrilFunction('t', ce, result)) {
                var item = { callExpression: ce, message: undefined, withParams: false, knownParams: undefined, hint: undefined };
                item.message = evalNode.evalNode(ce.arguments[0], tc, null);
                if (ce.arguments.length >= 2) {
                    item.withParams = true;
                    var params = evalNode.evalNode(ce.arguments[1], tc, null);
                    item.knownParams = params !== undefined && typeof params === "object" ? Object.keys(params) : [];
                }
                if (ce.arguments.length >= 3) {
                    item.hint = evalNode.evalNode(ce.arguments[2], tc, null);
                }
                result.trs.push(item);
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
    throw new Error('Don\'t know how to create node for ' + value);
}
function setMethod(callExpression, name) {
    var ex = callExpression.expression;
    var result = ts.createNode(65 /* Identifier */);
    result.pos = -1;
    result.flags = ex.name.flags;
    result.text = name;
    ex.name = result;
    ex.pos = -1; // This is for correctly not wrap line after "b."
}
exports.setMethod = setMethod;
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
function setArgumentCount(callExpression, count) {
    var a = callExpression.arguments;
    while (a.length < count) {
        a.push(createNodeFromValue(null));
    }
    while (count < a.length) {
        a.pop();
    }
}
exports.setArgumentCount = setArgumentCount;
function assign(target) {
    var sources = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
    }
    var totalArgs = arguments.length;
    for (var i = 1; i < totalArgs; i++) {
        var source = arguments[i];
        if (source == null)
            continue;
        var keys = Object.keys(source);
        var totalKeys = keys.length;
        for (var j = 0; j < totalKeys; j++) {
            var key = keys[j];
            target[key] = source[key];
        }
    }
    return target;
}
function rememberCallExpression(callExpression) {
    var argumentsOriginal = callExpression.arguments;
    callExpression.arguments = assign(argumentsOriginal.slice(0), argumentsOriginal);
    var ex = callExpression.expression;
    var expressionName = ex.name;
    var expressionPos = ex.pos;
    return function () {
        callExpression.arguments = argumentsOriginal;
        ex.name = expressionName;
        ex.pos = expressionPos;
    };
}
exports.rememberCallExpression = rememberCallExpression;
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
    var bundleCache = new imgCache.ImgBundleCache(new imgCache.ImgCache());
    for (var i = 0; i < sourceFiles.length; i++) {
        var src = sourceFiles[i];
        if (src.hasNoDefaultLib)
            continue; // skip searching default lib
        var srcInfo = gatherSourceInfo(src, tc, function (nn) { return path.join(path.dirname(nn.getSourceFile().fileName), nn.text); });
        //console.log(src.fileName);
        //console.log(srcInfo);
        if (srcInfo.sprites.length > 0) {
            for (var i_1 = 0; i_1 < srcInfo.sprites.length; i_1++) {
                var si = srcInfo.sprites[i_1];
                bundleCache.add(path.join(full, si.name), si.color, si.width, si.height, si.x, si.y);
            }
        }
    }
    bundleCache.wasChange();
    var prom = bundleCache.build().then(function (bi) {
        return imageOps.savePNG(bi, path.join(full, "bundle.png"));
    }).then(function () {
        for (var i = 0; i < sourceFiles.length; i++) {
            var src = sourceFiles[i];
            if (src.hasNoDefaultLib)
                continue; // skip searching default lib
            var srcInfo = gatherSourceInfo(src, tc, function (nn) { return path.join(path.dirname(nn.getSourceFile().fileName), nn.text); });
            if (srcInfo.sprites.length > 0) {
                for (var i_2 = 0; i_2 < srcInfo.sprites.length; i_2++) {
                    var si = srcInfo.sprites[i_2];
                    var bundlePos = bundleCache.query(path.join(full, si.name), si.color, si.width, si.height, si.x, si.y);
                    setMethod(si.callExpression, "spriteb");
                    setArgument(si.callExpression, 0, bundlePos.width);
                    setArgument(si.callExpression, 1, bundlePos.height);
                    setArgument(si.callExpression, 2, bundlePos.x);
                    setArgument(si.callExpression, 3, bundlePos.y);
                    setArgumentCount(si.callExpression, 4);
                }
            }
        }
    });
    prom = prom.then(function () {
        for (var i = 0; i < sourceFiles.length; i++) {
            var src = sourceFiles[i];
            if (src.hasNoDefaultLib)
                continue; // skip searching default lib
            program.emit(src);
        }
    }).then(done, function (err) {
        console.log(err);
    });
}
exports.compile = compile;
