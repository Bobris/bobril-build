import * as ts from "typescript";
import * as fs from "fs";
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as evalNode from "./evalNode";
import * as spriter from "./spriter";
import * as imageOps from "./imageOps";
import * as imgCache from "./imgCache";
require('bluebird');

export interface SourceInfo {
    sourceFile: ts.SourceFile;
    // module name, module main file
    sourceDeps: [string, string][];
    bobrilNamespace: string;
    bobrilImports: { [name: string]: string };
    bobrilG11NNamespace: string;
    bobrilG11NImports: { [name: string]: string };
    styleDefs: StyleDefInfo[];
    sprites: SpriteInfo[];
    trs: TranslationMessage[];
    assets: AssetInfo[];
}

export interface AssetInfo {
    callExpression: ts.CallExpression;
    name?: string;
}

export interface StyleDefInfo {
    callExpression: ts.CallExpression;
    isEx: boolean;
    name?: string;
    userNamed: boolean;
}

export interface SpriteInfo {
    callExpression: ts.CallExpression;
    name?: string;
    color?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export interface TranslationMessage {
    callExpression: ts.CallExpression;
    message: string | number;
    withParams: boolean;
    knownParams?: string[];
    hint?: string;
    justFormat?: boolean;
}

function isBobrilFunction(name: string, callExpression: ts.CallExpression, sourceInfo: SourceInfo): boolean {
    let text = callExpression.expression.getText();
    return text === sourceInfo.bobrilNamespace + '.' + name || text === sourceInfo.bobrilImports[name];
}

function isBobrilG11NFunction(name: string, callExpression: ts.CallExpression, sourceInfo: SourceInfo): boolean {
    let text = callExpression.expression.getText();
    return text === sourceInfo.bobrilG11NNamespace + '.' + name || text === sourceInfo.bobrilG11NImports[name];
}

function extractBindings(bindings: ts.NamespaceImport | ts.NamedImports, ns: string, ims: Object): string {
    if (bindings.kind === ts.SyntaxKind.NamedImports) {
        let namedBindings = <ts.NamedImports>bindings;
        for (let i = 0; i < namedBindings.elements.length; i++) {
            let binding = namedBindings.elements[i];
            ims[(binding.propertyName || binding.name).text] = binding.name.text;
        }
    } else if (ns == null && bindings.kind === ts.SyntaxKind.NamespaceImport) {
        return (<ts.NamespaceImport>bindings).name.text;
    }
    return ns;
}

export function gatherSourceInfo(source: ts.SourceFile, tc: ts.TypeChecker, resolvePathStringLiteral: (sl: ts.StringLiteral) => string): SourceInfo {
    let result: SourceInfo = {
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
    function visit(n: ts.Node) {
        if (n.kind === ts.SyntaxKind.ImportDeclaration) {
            let id = <ts.ImportDeclaration>n;
            let moduleSymbol = tc.getSymbolAtLocation(id.moduleSpecifier);
            if (moduleSymbol == null) return;
            let fn = moduleSymbol.valueDeclaration.getSourceFile().fileName;
            if (id.importClause) {
                let bindings = id.importClause.namedBindings;
                if (/bobril\/index\.ts/i.test(fn)) {
                    result.bobrilNamespace = extractBindings(bindings, result.bobrilNamespace, result.bobrilImports);
                } else if (/bobril-g11n\/index\.ts/i.test(fn)) {
                    result.bobrilG11NNamespace = extractBindings(bindings, result.bobrilG11NNamespace, result.bobrilG11NImports);
                }
            }
            result.sourceDeps.push([moduleSymbol.name, fn]);
        }
        else if (n.kind === ts.SyntaxKind.ExportDeclaration) {
            let ed = <ts.ExportDeclaration>n;
            if (ed.moduleSpecifier) {
                let moduleSymbol = tc.getSymbolAtLocation(ed.moduleSpecifier);
                if (moduleSymbol == null) return;
                result.sourceDeps.push([moduleSymbol.name, moduleSymbol.valueDeclaration.getSourceFile().fileName]);
            }
        }
        else if (n.kind === ts.SyntaxKind.CallExpression) {
            let ce = <ts.CallExpression>n;
            if (isBobrilFunction('asset', ce, result)) {
                result.assets.push({ callExpression: ce, name: evalNode.evalNode(ce.arguments[0], tc, resolvePathStringLiteral) });
            } else if (isBobrilFunction('sprite', ce, result)) {
                let si: SpriteInfo = { callExpression: ce };
                for (let i = 0; i < ce.arguments.length; i++) {
                    let res = evalNode.evalNode(ce.arguments[i], tc, i === 0 ? resolvePathStringLiteral : null); // first argument is path
                    if (res !== undefined) switch (i) {
                        case 0:
                            if (typeof res === 'string') si.name = res;
                            break;
                        case 1:
                            if (typeof res === 'string') si.color = res;
                            break;
                        case 2:
                            if (typeof res === 'number') si.width = res;
                            break;
                        case 3:
                            if (typeof res === 'number') si.height = res;
                            break;
                        case 4:
                            if (typeof res === 'number') si.x = res;
                            break;
                        case 5:
                            if (typeof res === 'number') si.y = res;
                            break;
                        default: throw new Error('b.sprite cannot have more than 6 parameters');
                    }
                }
                result.sprites.push(si);
            } else if (isBobrilFunction('styleDef', ce, result) || isBobrilFunction('styleDefEx', ce, result)) {
                let item: StyleDefInfo = { callExpression: ce, isEx: isBobrilFunction('styleDefEx', ce, result), userNamed: false };
                if (ce.arguments.length == 3 + (item.isEx ? 1 : 0)) {
                    item.name = evalNode.evalNode(ce.arguments[ce.arguments.length - 1], tc, null);
                    item.userNamed = true;
                } else {
                    if (ce.parent.kind === ts.SyntaxKind.VariableDeclaration) {
                        let vd = <ts.VariableDeclaration>ce.parent;
                        item.name = (<ts.Identifier>vd.name).text;
                    } else if (ce.parent.kind === ts.SyntaxKind.BinaryExpression) {
                        let be = <ts.BinaryExpression>ce.parent;
                        if (be.operatorToken.kind === ts.SyntaxKind.FirstAssignment && be.left.kind === ts.SyntaxKind.Identifier) {
                            item.name = (<ts.Identifier>be.left).text;
                        }
                    }
                }
                result.styleDefs.push(item);
            } else if (isBobrilG11NFunction('t', ce, result)) {
                let item: TranslationMessage = { callExpression: ce, message: undefined, withParams: false, knownParams: undefined, hint: undefined, justFormat: false };
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
            } else if (isBobrilG11NFunction('f', ce, result)) {
                let item: TranslationMessage = { callExpression: ce, message: undefined, withParams: false, knownParams: undefined, hint: undefined, justFormat: true };
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

function createNodeFromValue(value: string | number | boolean): ts.Node {
    if (value === null) {
        let nullNode = ts.createNode(ts.SyntaxKind.NullKeyword);
        nullNode.pos = -1;
        return nullNode;
    }
    if (value === true) {
        let result = ts.createNode(ts.SyntaxKind.TrueKeyword);
        result.pos = -1;
        return result;
    }
    if (value === false) {
        let result = ts.createNode(ts.SyntaxKind.FalseKeyword);
        result.pos = -1;
        return result;
    }
    if (typeof value === "string") {
        let result = <ts.StringLiteral>ts.createNode(ts.SyntaxKind.StringLiteral);
        result.pos = -1;
        result.text = value;
        return result;
    }
    if (typeof value === "number") {
        let result = <ts.LiteralExpression>ts.createNode(ts.SyntaxKind.NumericLiteral);
        result.pos = -1;
        result.text = "" + value;
        return result;
    }
    throw new Error('Don\'t know how to create node for ' + value);
}

export function setMethod(callExpression: ts.CallExpression, name: string) {
    var ex = <ts.PropertyAccessExpression>callExpression.expression;
    let result = <ts.Identifier>ts.createNode(ts.SyntaxKind.Identifier);
    result.pos = -1;
    result.flags = ex.name.flags;
    result.text = name;
    ex.name = result;
    ex.pos = -1; // This is for correctly not wrap line after "b."
}

export function setArgumentAst(callExpression: ts.CallExpression, index: number, value: ts.Expression): void {
    while (callExpression.arguments.length < index) {
        callExpression.arguments.push(<ts.Expression>createNodeFromValue(null));
    }
    if (callExpression.arguments.length === index) {
        callExpression.arguments.push(value);
    } else {
        callExpression.arguments[index] = value;
    }
}

function createNodeArray<T extends ts.Node>(len: number): ts.NodeArray<T> {
    let arr = [];
    while (len-- > 0) arr.push(null);
    let res = <ts.NodeArray<T>>arr;
    res.pos = -1;
    res.end = -1;
    return res;
}

export function buildLambdaReturningArray(values: ts.Expression[]): ts.Expression {
    let pos = values[0].pos;
    let end = values[values.length - 1].end;
    let fn = <ts.ArrowFunction>ts.createNode(ts.SyntaxKind.ArrowFunction);
    fn.parameters = createNodeArray<ts.ParameterDeclaration>(0);
    fn.equalsGreaterThanToken = ts.createNode(ts.SyntaxKind.EqualsGreaterThanToken);
    let body = <ts.ArrayLiteralExpression>ts.createNode(ts.SyntaxKind.ArrayLiteralExpression);
    body.elements = createNodeArray<ts.Expression>(0);
    body.elements.push(...values);
    body.pos = pos;
    body.end = end;
    fn.body = body;
    fn.pos = pos;
    fn.end = end;
    return fn;
}

export function setArgument(callExpression: ts.CallExpression, index: number, value: string | number | boolean): void {
    setArgumentAst(callExpression, index, <ts.Expression>createNodeFromValue(value));
}

export function setArgumentCount(callExpression: ts.CallExpression, count: number) {
    var a = callExpression.arguments;
    while (a.length < count) {
        a.push(<ts.Expression>createNodeFromValue(null));
    }
    while (count < a.length) {
        a.pop();
    }
}

function assign(target: Object, ...sources: Object[]): Object {
    let totalArgs = arguments.length;
    for (let i = 1; i < totalArgs; i++) {
        let source = arguments[i];
        if (source == null) continue;
        let keys = Object.keys(source);
        let totalKeys = keys.length;
        for (let j = 0; j < totalKeys; j++) {
            let key = keys[j];
            (<any>target)[key] = (<any>source)[key];
        }
    }
    return target;
}

export function rememberCallExpression(callExpression: ts.CallExpression): () => void {
    let argumentsOriginal = callExpression.arguments;
    callExpression.arguments = <any>assign(argumentsOriginal.slice(0), argumentsOriginal);
    var ex = <ts.PropertyAccessExpression>callExpression.expression;
    let expressionName = ex.name;
    let expressionPos = ex.pos;
    return () => {
        callExpression.arguments = argumentsOriginal;
        ex.name = expressionName;
        ex.pos = expressionPos;
    };
}

// ts.getSymbol crashes without setting parent, but if you set parent it will ignore content in emit, that's why there is also "Harder" version 
export function applyOverrides(overrides: { varDecl: ts.VariableDeclaration, value: string | number | boolean }[]): () => void {
    let restore: { varDecl: ts.VariableDeclaration, initializer: ts.Expression }[] = [];
    for (let i = 0; i < overrides.length; i++) {
        let o = overrides[i];
        restore.push({ varDecl: o.varDecl, initializer: o.varDecl.initializer });
        o.varDecl.initializer = <ts.Expression>createNodeFromValue(o.value);
        o.varDecl.initializer.parent = o.varDecl;
    }
    return () => {
        for (let i = restore.length; i-- > 0;) {
            restore[i].varDecl.initializer = restore[i].initializer;
        }
    }
}

export function applyOverridesHarder(overrides: { varDecl: ts.VariableDeclaration, value: string | number | boolean }[]) {
    for (let i = 0; i < overrides.length; i++) {
        let o = overrides[i];
        o.varDecl.initializer = <ts.Expression>createNodeFromValue(o.value);
    }
}
