import * as ts from "typescript";
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes

export function evalNode(n: ts.Node, tc: ts.TypeChecker, resolveStringLiteral: (sl: ts.StringLiteral) => string): any {
    switch (n.kind) {
        case ts.SyntaxKind.StringLiteral: {
            let nn = <ts.StringLiteral>n;
            if (resolveStringLiteral) {
                return resolveStringLiteral(nn);
            }
            return nn.text;
        }
        case ts.SyntaxKind.NumericLiteral: {
            let nn = <ts.LiteralExpression>n;
            return parseFloat(nn.text);
        }
        case ts.SyntaxKind.TrueKeyword: return true;
        case ts.SyntaxKind.FalseKeyword: return false;
        case ts.SyntaxKind.NullKeyword: return null;
        case ts.SyntaxKind.PrefixUnaryExpression: {
            let nn = <ts.PrefixUnaryExpression>n;
            let operand = evalNode(nn.operand, tc, resolveStringLiteral);
            if (operand !== undefined) {
                let op = null;
                switch (nn.operator) {
                    case ts.SyntaxKind.PlusToken: op = "+"; break;
                    case ts.SyntaxKind.MinusToken: op = "-"; break;
                    case ts.SyntaxKind.TildeToken: op = "~"; break;
                    case ts.SyntaxKind.ExclamationToken: op = "!"; break;
                    default: return undefined;
                }
                var f = new Function("a", "return " + op + "a");
                return f(operand);
            }
            return undefined;
        }
        case ts.SyntaxKind.BinaryExpression: {
            let nn = <ts.BinaryExpression>n;
            let left = evalNode(nn.left, tc, resolveStringLiteral);
            let right = evalNode(nn.right, tc, null);
            if (left !== undefined && right !== undefined) {
                let op = null;
                switch (nn.operatorToken.kind) {
                    case ts.SyntaxKind.BarBarToken:
                    case ts.SyntaxKind.AmpersandAmpersandToken:
                    case ts.SyntaxKind.BarToken:
                    case ts.SyntaxKind.CaretToken:
                    case ts.SyntaxKind.AmpersandToken:
                    case ts.SyntaxKind.EqualsEqualsToken:
                    case ts.SyntaxKind.ExclamationEqualsToken:
                    case ts.SyntaxKind.EqualsEqualsEqualsToken:
                    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                    case ts.SyntaxKind.LessThanToken:
                    case ts.SyntaxKind.GreaterThanToken:
                    case ts.SyntaxKind.LessThanEqualsToken:
                    case ts.SyntaxKind.GreaterThanEqualsToken:
                    case ts.SyntaxKind.InstanceOfKeyword:
                    case ts.SyntaxKind.InKeyword:
                    case ts.SyntaxKind.LessThanLessThanToken:
                    case ts.SyntaxKind.GreaterThanGreaterThanToken:
                    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                    case ts.SyntaxKind.PlusToken:
                    case ts.SyntaxKind.MinusToken:
                    case ts.SyntaxKind.AsteriskToken:
                    case ts.SyntaxKind.SlashToken:
                    case ts.SyntaxKind.PercentToken:
                        op = nn.operatorToken.getText();
                        break;
                    default: return undefined;
                }
                var f = new Function("a", "b", "return a " + op + " b");
                return f(left, right);
            }
            return undefined;
        }
        case ts.SyntaxKind.ConditionalExpression: {
            let nn = <ts.ConditionalExpression>n;
            var cond = evalNode(nn.condition, tc, null);
            if (cond === undefined) return undefined;
            let e = cond ? nn.whenTrue : nn.whenFalse;
            return evalNode(e, tc, resolveStringLiteral);
        }
        case ts.SyntaxKind.Identifier:
        case ts.SyntaxKind.PropertyAccessExpression: {
            let s = tc.getSymbolAtLocation(n);
            if (s.flags & ts.SymbolFlags.Variable) {
                if (s.valueDeclaration.parent.flags & ts.NodeFlags.Const) {
                    return evalNode((<ts.VariableDeclaration>s.valueDeclaration).initializer, tc, resolveStringLiteral);
                }
            }
            return undefined;
        }
        case ts.SyntaxKind.TypeAssertionExpression: {
            let nn = <ts.TypeAssertion>n;
            return evalNode(nn.expression, tc, resolveStringLiteral);
        }
        case ts.SyntaxKind.ObjectLiteralExpression: {
            let ole = <ts.ObjectLiteralExpression>n;
            let res = {};
            for (let i = 0; i < ole.properties.length; i++) {
                let prop = ole.properties[i];
                if (prop.kind === ts.SyntaxKind.PropertyAssignment && (prop.name.kind === ts.SyntaxKind.Identifier || prop.name.kind === ts.SyntaxKind.StringLiteral)) {
                    let name = prop.name.kind === ts.SyntaxKind.Identifier ? (<ts.Identifier>prop.name).text : (<ts.StringLiteral>prop.name).text;
                    res[name] = evalNode((<ts.PropertyAssignment>prop).initializer, tc, resolveStringLiteral);
                }
            }
            return res;
        }
        default: return undefined;
    }
}
