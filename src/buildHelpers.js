"use strict";
var ts = require("typescript");
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var evalNode = require("./evalNode");
require('bluebird');
function isBobrilFunction(name, callExpression, sourceInfo) {
    var text = callExpression.expression.getText();
    return text === sourceInfo.bobrilNamespace + '.' + name || text === sourceInfo.bobrilImports[name];
}
function isBobrilG11NFunction(name, callExpression, sourceInfo) {
    var text = callExpression.expression.getText();
    return text === sourceInfo.bobrilG11NNamespace + '.' + name || text === sourceInfo.bobrilG11NImports[name];
}
function extractBindings(bindings, ns, ims) {
    if (bindings.kind === ts.SyntaxKind.NamedImports) {
        var namedBindings = bindings;
        for (var i = 0; i < namedBindings.elements.length; i++) {
            var binding = namedBindings.elements[i];
            ims[(binding.propertyName || binding.name).text] = binding.name.text;
        }
    }
    else if (ns == null && bindings.kind === ts.SyntaxKind.NamespaceImport) {
        return bindings.name.text;
    }
    return ns;
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
        trs: [],
        assets: []
    };
    function visit(n) {
        if (n.kind === ts.SyntaxKind.ImportDeclaration) {
            var id = n;
            var moduleSymbol = tc.getSymbolAtLocation(id.moduleSpecifier);
            var fn = moduleSymbol.valueDeclaration.getSourceFile().fileName;
            var bindings = id.importClause.namedBindings;
            if (/bobril\/index\.ts/i.test(fn)) {
                result.bobrilNamespace = extractBindings(bindings, result.bobrilNamespace, result.bobrilImports);
            }
            else if (/bobril-g11n\/index\.ts/i.test(fn)) {
                result.bobrilG11NNamespace = extractBindings(bindings, result.bobrilG11NNamespace, result.bobrilG11NImports);
            }
            result.sourceDeps.push([moduleSymbol.name, fn]);
        }
        else if (n.kind === ts.SyntaxKind.ExportDeclaration) {
            var ed = n;
            if (ed.moduleSpecifier) {
                var moduleSymbol = tc.getSymbolAtLocation(ed.moduleSpecifier);
                result.sourceDeps.push([moduleSymbol.name, moduleSymbol.valueDeclaration.getSourceFile().fileName]);
            }
        }
        else if (n.kind === ts.SyntaxKind.CallExpression) {
            var ce = n;
            if (isBobrilFunction('asset', ce, result)) {
                result.assets.push({ callExpression: ce, name: evalNode.evalNode(ce.arguments[0], tc, resolvePathStringLiteral) });
            }
            else if (isBobrilFunction('sprite', ce, result)) {
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
                    if (ce.parent.kind === ts.SyntaxKind.VariableDeclaration) {
                        var vd = ce.parent;
                        item.name = vd.name.text;
                    }
                    else if (ce.parent.kind === ts.SyntaxKind.BinaryExpression) {
                        var be = ce.parent;
                        if (be.operatorToken.kind === ts.SyntaxKind.FirstAssignment && be.left.kind === ts.SyntaxKind.Identifier) {
                            item.name = be.left.text;
                        }
                    }
                }
                result.styleDefs.push(item);
            }
            else if (isBobrilG11NFunction('t', ce, result)) {
                var item = { callExpression: ce, message: undefined, withParams: false, knownParams: undefined, hint: undefined, justFormat: false };
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
            else if (isBobrilG11NFunction('f', ce, result)) {
                var item = { callExpression: ce, message: undefined, withParams: false, knownParams: undefined, hint: undefined, justFormat: true };
                item.message = evalNode.evalNode(ce.arguments[0], tc, null);
                if (ce.arguments.length >= 2) {
                    item.withParams = true;
                    var params = evalNode.evalNode(ce.arguments[1], tc, null);
                    item.knownParams = params !== undefined && typeof params === "object" ? Object.keys(params) : [];
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
        var nullNode = ts.createNode(ts.SyntaxKind.NullKeyword);
        nullNode.pos = -1;
        return nullNode;
    }
    if (value === true) {
        var result = ts.createNode(ts.SyntaxKind.TrueKeyword);
        result.pos = -1;
        return result;
    }
    if (value === false) {
        var result = ts.createNode(ts.SyntaxKind.FalseKeyword);
        result.pos = -1;
        return result;
    }
    if (typeof value === "string") {
        var result = ts.createNode(ts.SyntaxKind.StringLiteral);
        result.pos = -1;
        result.text = value;
        return result;
    }
    if (typeof value === "number") {
        var result = ts.createNode(ts.SyntaxKind.NumericLiteral);
        result.pos = -1;
        result.text = "" + value;
        return result;
    }
    throw new Error('Don\'t know how to create node for ' + value);
}
function setMethod(callExpression, name) {
    var ex = callExpression.expression;
    var result = ts.createNode(ts.SyntaxKind.Identifier);
    result.pos = -1;
    result.flags = ex.name.flags;
    result.text = name;
    ex.name = result;
    ex.pos = -1; // This is for correctly not wrap line after "b."
}
exports.setMethod = setMethod;
function setArgumentAst(callExpression, index, value) {
    while (callExpression.arguments.length < index) {
        callExpression.arguments.push(createNodeFromValue(null));
    }
    if (callExpression.arguments.length === index) {
        callExpression.arguments.push(value);
    }
    else {
        callExpression.arguments[index] = value;
    }
}
exports.setArgumentAst = setArgumentAst;
function createNodeArray(len) {
    var arr = [];
    while (len-- > 0)
        arr.push(null);
    var res = arr;
    res.pos = -1;
    res.end = -1;
    return res;
}
function buildLambdaReturningArray(values) {
    var pos = values[0].pos;
    var end = values[values.length - 1].end;
    var fn = ts.createNode(ts.SyntaxKind.ArrowFunction);
    fn.parameters = createNodeArray(0);
    fn.equalsGreaterThanToken = ts.createNode(ts.SyntaxKind.EqualsGreaterThanToken);
    var body = ts.createNode(ts.SyntaxKind.ArrayLiteralExpression);
    body.elements = createNodeArray(0);
    (_a = body.elements).push.apply(_a, values);
    body.pos = pos;
    body.end = end;
    fn.body = body;
    fn.pos = pos;
    fn.end = end;
    return fn;
    var _a;
}
exports.buildLambdaReturningArray = buildLambdaReturningArray;
function setArgument(callExpression, index, value) {
    setArgumentAst(callExpression, index, createNodeFromValue(value));
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
function applyOverrides(overrides) {
    var restore = [];
    for (var i = 0; i < overrides.length; i++) {
        var o = overrides[i];
        restore.push({ varDecl: o.varDecl, initializer: o.varDecl.initializer });
        o.varDecl.initializer = createNodeFromValue(o.value);
    }
    return function () {
        for (var i = restore.length; i-- > 0;) {
            restore[i].varDecl.initializer = restore[i].initializer;
        }
    };
}
exports.applyOverrides = applyOverrides;
