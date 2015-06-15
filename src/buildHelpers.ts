import * as ts from "typescript";
import * as evalNode from "./evalNode";

export interface SourceInfo {
    sprites: SpriteInfo[];
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

export function gatherSourceInfo(source: ts.SourceFile, tc: ts.TypeChecker): SourceInfo {
    let result: SourceInfo = { sprites: [] };
    function visit(n: ts.Node) {
        if (n.kind === ts.SyntaxKind.CallExpression) {
            let ce = <ts.CallExpression>n;
            if (ce.expression.getText() === "b.sprite") {
                let si: SpriteInfo = { callExpression: ce };
                for (let i = 0; i < ce.arguments.length; i++) {
                    let res = evalNode.evalNode(ce.arguments[i], tc, i === 0); // first argument is path
                    if (res !== undefined) switch (i) {
                        case 0:
                            if (typeof res === "string") si.name = res;
                            break;
                        case 1:
                            if (typeof res === "string") si.color = res;
                            break;
                        case 2:
                            if (typeof res === "number") si.width = res;
                            break;
                        case 3:
                            if (typeof res === "number") si.height = res;
                            break;
                        case 4:
                            if (typeof res === "number") si.x = res;
                            break;
                        case 5:
                            if (typeof res === "number") si.y = res;
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

function createNodeFromValue(value: string|number|boolean): ts.Node {
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
        result.text = ""+value;
        return result;
    }
    throw new Error("Don't know how to create node for "+value);
}

export function setArgument(callExpression: ts.CallExpression, index: number, value: string|number|boolean): void {
    while (callExpression.arguments.length < index) {
        callExpression.arguments.push(<ts.Expression>createNodeFromValue(null));
    }
    if (callExpression.arguments.length === index) {
        callExpression.arguments.push(<ts.Expression>createNodeFromValue(value));
    } else {
        callExpression.arguments[index] = <ts.Expression>createNodeFromValue(value);
    }
}
