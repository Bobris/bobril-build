"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everywhere, just use forward slashes
const evalNode = require("./evalNode");
require('bluebird');
function isBobrilFunction(name, callExpression, sourceInfo) {
    let text = callExpression.expression.getText();
    return text === sourceInfo.bobrilNamespace + '.' + name || text === sourceInfo.bobrilImports[name];
}
function isBobrilG11NFunction(name, callExpression, sourceInfo) {
    let text = callExpression.expression.getText();
    return text === sourceInfo.bobrilG11NNamespace + '.' + name || text === sourceInfo.bobrilG11NImports[name];
}
function extractBindings(bindings, ns, ims) {
    if (bindings.kind === ts.SyntaxKind.NamedImports) {
        let namedBindings = bindings;
        for (let i = 0; i < namedBindings.elements.length; i++) {
            let binding = namedBindings.elements[i];
            ims[(binding.propertyName || binding.name).text] = binding.name.text;
        }
    }
    else if (ns == null && bindings.kind === ts.SyntaxKind.NamespaceImport) {
        return bindings.name.text;
    }
    return ns;
}
function gatherSourceInfo(source, tc, resolvePathStringLiteral) {
    let result = {
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
            let id = n;
            let moduleSymbol = tc.getSymbolAtLocation(id.moduleSpecifier);
            if (moduleSymbol == null)
                return;
            let fn = moduleSymbol.valueDeclaration.getSourceFile().fileName;
            if (id.importClause) {
                let bindings = id.importClause.namedBindings;
                if (/bobriln?\/index\.ts/i.test(fn)) {
                    result.bobrilNamespace = extractBindings(bindings, result.bobrilNamespace, result.bobrilImports);
                }
                else if (/bobril-g11n\/index\.ts/i.test(fn)) {
                    result.bobrilG11NNamespace = extractBindings(bindings, result.bobrilG11NNamespace, result.bobrilG11NImports);
                }
            }
            result.sourceDeps.push([moduleSymbol.name, fn]);
        }
        else if (n.kind === ts.SyntaxKind.ExportDeclaration) {
            let ed = n;
            if (ed.moduleSpecifier) {
                let moduleSymbol = tc.getSymbolAtLocation(ed.moduleSpecifier);
                if (moduleSymbol == null)
                    return;
                result.sourceDeps.push([moduleSymbol.name, moduleSymbol.valueDeclaration.getSourceFile().fileName]);
            }
        }
        else if (n.kind === ts.SyntaxKind.CallExpression) {
            let ce = n;
            if (isBobrilFunction('asset', ce, result)) {
                result.assets.push({ callExpression: ce, name: evalNode.evalNode(ce.arguments[0], tc, resolvePathStringLiteral) });
            }
            else if (isBobrilFunction('sprite', ce, result)) {
                let si = { callExpression: ce };
                for (let i = 0; i < ce.arguments.length; i++) {
                    let res = evalNode.evalNode(ce.arguments[i], tc, i === 0 ? resolvePathStringLiteral : null); // first argument is path
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
                let item = { callExpression: ce, isEx: isBobrilFunction('styleDefEx', ce, result), userNamed: false };
                if (ce.arguments.length == 3 + (item.isEx ? 1 : 0)) {
                    item.name = evalNode.evalNode(ce.arguments[ce.arguments.length - 1], tc, null);
                    item.userNamed = true;
                }
                else {
                    if (ce.parent.kind === ts.SyntaxKind.VariableDeclaration) {
                        let vd = ce.parent;
                        item.name = vd.name.text;
                    }
                    else if (ce.parent.kind === ts.SyntaxKind.BinaryExpression) {
                        let be = ce.parent;
                        if (be.operatorToken != null && be.left != null && be.operatorToken.kind === ts.SyntaxKind.FirstAssignment && be.left.kind === ts.SyntaxKind.Identifier) {
                            item.name = be.left.text;
                        }
                    }
                }
                result.styleDefs.push(item);
            }
            else if (isBobrilG11NFunction('t', ce, result)) {
                let item = { callExpression: ce, message: undefined, withParams: false, knownParams: undefined, hint: undefined, justFormat: false };
                item.message = evalNode.evalNode(ce.arguments[0], tc, null);
                if (ce.arguments.length >= 2) {
                    item.withParams = true;
                    let params = evalNode.evalNode(ce.arguments[1], tc, null);
                    item.knownParams = params !== undefined && typeof params === "object" ? Object.keys(params) : [];
                }
                if (ce.arguments.length >= 3) {
                    item.hint = evalNode.evalNode(ce.arguments[2], tc, null);
                }
                result.trs.push(item);
            }
            else if (isBobrilG11NFunction('f', ce, result)) {
                let item = { callExpression: ce, message: undefined, withParams: false, knownParams: undefined, hint: undefined, justFormat: true };
                item.message = evalNode.evalNode(ce.arguments[0], tc, null);
                if (ce.arguments.length >= 2) {
                    item.withParams = true;
                    let params = evalNode.evalNode(ce.arguments[1], tc, null);
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
        let nullNode = ts.createNode(ts.SyntaxKind.NullKeyword);
        return nullNode;
    }
    if (value === undefined) {
        let undefinedNode = ts.createNode(ts.SyntaxKind.Identifier);
        undefinedNode.text = "undefined";
        return undefinedNode;
    }
    if (value === true) {
        let result = ts.createNode(ts.SyntaxKind.TrueKeyword);
        return result;
    }
    if (value === false) {
        let result = ts.createNode(ts.SyntaxKind.FalseKeyword);
        return result;
    }
    if (typeof value === "string") {
        let result = ts.createNode(ts.SyntaxKind.StringLiteral);
        result.text = value;
        result.hasExtendedUnicodeEscape = true;
        return result;
    }
    if (typeof value === "number") {
        let result = ts.createNode(ts.SyntaxKind.NumericLiteral);
        result.text = "" + value;
        return result;
    }
    if (Array.isArray(value)) {
        let result = ts.createNode(ts.SyntaxKind.ArrayLiteralExpression);
        result.elements = createNodeArray(0);
        for (var i = 0; i < value.length; i++) {
            result.elements.push(createNodeFromValue(value[i]));
        }
        return result;
    }
    if (typeof value === "object") {
        let result = ts.createNode(ts.SyntaxKind.ObjectLiteralExpression);
        result.properties = createNodeArray(0);
        for (var key in value) {
            let pa = ts.createNode(ts.SyntaxKind.PropertyAssignment);
            let name = ts.createNode(ts.SyntaxKind.Identifier);
            name.text = key;
            pa.name = name;
            pa.initializer = createNodeFromValue(value[key]);
            result.properties.push(pa);
        }
        return result;
    }
    throw new Error('Don\'t know how to create node for ' + value);
}
exports.createNodeFromValue = createNodeFromValue;
function setMethod(callExpression, name) {
    var ex = callExpression.expression;
    let result = ts.createNode(ts.SyntaxKind.Identifier);
    result.flags = ex.name.flags;
    result.text = name;
    result.parent = ex;
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
    let arr = [];
    while (len-- > 0)
        arr.push(null);
    let res = arr;
    res.pos = 0;
    res.end = 0;
    return res;
}
function buildLambdaReturningArray(values) {
    let pos = values[0].pos;
    let end = values[values.length - 1].end;
    let fn = ts.createNode(ts.SyntaxKind.ArrowFunction);
    fn.parameters = createNodeArray(0);
    fn.equalsGreaterThanToken = ts.createNode(ts.SyntaxKind.EqualsGreaterThanToken);
    let body = ts.createNode(ts.SyntaxKind.ArrayLiteralExpression);
    body.elements = createNodeArray(0);
    body.elements.push(...values);
    body.pos = pos;
    body.end = end;
    fn.body = body;
    fn.pos = pos;
    fn.end = end;
    return fn;
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
function assign(target, ...sources) {
    let totalArgs = arguments.length;
    for (let i = 1; i < totalArgs; i++) {
        let source = arguments[i];
        if (source == null)
            continue;
        let keys = Object.keys(source);
        let totalKeys = keys.length;
        for (let j = 0; j < totalKeys; j++) {
            let key = keys[j];
            target[key] = source[key];
        }
    }
    return target;
}
function rememberCallExpression(callExpression) {
    let argumentsOriginal = callExpression.arguments;
    callExpression.arguments = assign(argumentsOriginal.slice(0), argumentsOriginal);
    var ex = callExpression.expression;
    let expressionName = ex.name;
    let expressionPos = ex.pos;
    return () => {
        callExpression.arguments = argumentsOriginal;
        ex.name = expressionName;
        ex.pos = expressionPos;
    };
}
exports.rememberCallExpression = rememberCallExpression;
// ts.getSymbol crashes without setting parent, but if you set parent it will ignore content in emit, that's why there is also "Harder" version 
function applyOverrides(overrides) {
    let restore = [];
    for (let i = 0; i < overrides.length; i++) {
        let o = overrides[i];
        restore.push({ varDecl: o.varDecl, initializer: o.varDecl.initializer });
        o.varDecl.initializer = createNodeFromValue(o.value);
        o.varDecl.initializer.parent = o.varDecl;
    }
    return () => {
        for (let i = restore.length; i-- > 0;) {
            restore[i].varDecl.initializer = restore[i].initializer;
        }
    };
}
exports.applyOverrides = applyOverrides;
function applyOverridesHarder(overrides) {
    for (let i = 0; i < overrides.length; i++) {
        let o = overrides[i];
        o.varDecl.initializer = createNodeFromValue(o.value);
    }
}
exports.applyOverridesHarder = applyOverridesHarder;
function concat(left, right) {
    let res = ts.createNode(ts.SyntaxKind.BinaryExpression);
    res.operatorToken = ts.createNode(ts.SyntaxKind.PlusToken);
    res.left = left;
    res.right = right;
    if (left.parent != null)
        left.parent = res;
    if (right.parent != null)
        right.parent = res;
    return res;
}
exports.concat = concat;
//# sourceMappingURL=buildHelpers.js.map