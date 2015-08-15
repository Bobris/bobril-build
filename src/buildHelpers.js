var ts = require("typescript");
var evalNode = require("./evalNode");
require('bluebird');
function isBobrilFunction(name, callExpression, sourceInfo) {
    return callExpression.expression.getText() === sourceInfo.bobrilNamespace + '.' + name;
}
function isBobrilG11NFunction(name, callExpression, sourceInfo) {
    return callExpression.expression.getText() === sourceInfo.bobrilG11NNamespace + '.' + name;
}
function gatherSourceInfo(source, tc, resolvePathStringLiteral) {
    var result = {
        sourceFile: source,
        sourceDeps: [],
        bobrilNamespace: null,
        bobrilImports: Object.create(null),
        bobrilG11NNamespace: null,
        bobrilG11NImports: Object.create(null),
        sprites: [],
        styleDefs: [],
        trs: []
    };
    function visit(n) {
        if (n.kind === 220 /* ImportDeclaration */) {
            var id = n;
            var moduleSymbol = tc.getSymbolAtLocation(id.moduleSpecifier);
            var sf = moduleSymbol.valueDeclaration.getSourceFile();
            var fn = sf.fileName;
            if (/bobril\/index\.ts/i.test(fn)) {
                if (result.bobrilNamespace == null && id.importClause.namedBindings.kind === 222 /* NamespaceImport */) {
                    result.bobrilNamespace = id.importClause.namedBindings.name.text;
                }
            }
            else if (/bobril-g11n\/index\.ts/i.test(fn)) {
                if (result.bobrilG11NNamespace == null && id.importClause.namedBindings.kind === 222 /* NamespaceImport */) {
                    result.bobrilG11NNamespace = id.importClause.namedBindings.name.text;
                }
            }
            result.sourceDeps.push(fn);
        }
        else if (n.kind === 226 /* ExportDeclaration */) {
            var ed = n;
            if (ed.moduleSpecifier) {
                var moduleSymbol = tc.getSymbolAtLocation(ed.moduleSpecifier);
                result.sourceDeps.push(moduleSymbol.valueDeclaration.getSourceFile().fileName);
            }
        }
        else if (n.kind === 166 /* CallExpression */) {
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
                var item = { callExpression: ce, isEx: isBobrilFunction('styleDefEx', ce, result), userNamed: false };
                if (ce.arguments.length == 3 + (item.isEx ? 1 : 0)) {
                    item.name = evalNode.evalNode(ce.arguments[ce.arguments.length - 1], tc, null);
                    item.userNamed = true;
                }
                else {
                    if (ce.parent.kind === 209 /* VariableDeclaration */) {
                        var vd = ce.parent;
                        item.name = vd.name.text;
                    }
                    else if (ce.parent.kind === 179 /* BinaryExpression */) {
                        var be = ce.parent;
                        if (be.operatorToken.kind === 55 /* FirstAssignment */ && be.left.kind === 67 /* Identifier */) {
                            item.name = be.left.text;
                        }
                    }
                }
                result.styleDefs.push(item);
            }
            else if (isBobrilG11NFunction('t', ce, result)) {
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
        var nullNode = ts.createNode(91 /* NullKeyword */);
        nullNode.pos = -1;
        return nullNode;
    }
    if (value === true) {
        var result = ts.createNode(97 /* TrueKeyword */);
        result.pos = -1;
        return result;
    }
    if (value === false) {
        var result = ts.createNode(82 /* FalseKeyword */);
        result.pos = -1;
        return result;
    }
    if (typeof value === "string") {
        var result = ts.createNode(9 /* StringLiteral */);
        result.pos = -1;
        result.text = value;
        return result;
    }
    if (typeof value === "number") {
        var result = ts.createNode(8 /* NumericLiteral */);
        result.pos = -1;
        result.text = "" + value;
        return result;
    }
    throw new Error('Don\'t know how to create node for ' + value);
}
function setMethod(callExpression, name) {
    var ex = callExpression.expression;
    var result = ts.createNode(67 /* Identifier */);
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
