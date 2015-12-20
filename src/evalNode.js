"use strict";
var ts = require("typescript");
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
function evalNode(n, tc, resolveStringLiteral) {
    switch (n.kind) {
        case ts.SyntaxKind.StringLiteral: {
            var nn = n;
            if (resolveStringLiteral) {
                return resolveStringLiteral(nn);
            }
            return nn.text;
        }
        case ts.SyntaxKind.NumericLiteral: {
            var nn = n;
            return parseFloat(nn.text);
        }
        case ts.SyntaxKind.TrueKeyword: return true;
        case ts.SyntaxKind.FalseKeyword: return false;
        case ts.SyntaxKind.NullKeyword: return null;
        case ts.SyntaxKind.PrefixUnaryExpression: {
            var nn = n;
            var operand = evalNode(nn.operand, tc, resolveStringLiteral);
            if (operand !== undefined) {
                var op = null;
                switch (nn.operator) {
                    case ts.SyntaxKind.PlusToken:
                        op = "+";
                        break;
                    case ts.SyntaxKind.MinusToken:
                        op = "-";
                        break;
                    case ts.SyntaxKind.TildeToken:
                        op = "~";
                        break;
                    case ts.SyntaxKind.ExclamationToken:
                        op = "!";
                        break;
                    default: return undefined;
                }
                var f = new Function("a", "return " + op + "a");
                return f(operand);
            }
            return undefined;
        }
        case ts.SyntaxKind.BinaryExpression: {
            var nn = n;
            var left = evalNode(nn.left, tc, resolveStringLiteral);
            var right = evalNode(nn.right, tc, null);
            if (left !== undefined && right !== undefined) {
                var op = null;
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
            var nn = n;
            var cond = evalNode(nn.condition, tc, null);
            if (cond === undefined)
                return undefined;
            var e = cond ? nn.whenTrue : nn.whenFalse;
            return evalNode(e, tc, resolveStringLiteral);
        }
        case ts.SyntaxKind.ExportAssignment: {
            var nn = n;
            return evalNode(nn.expression, tc, resolveStringLiteral);
        }
        case ts.SyntaxKind.Identifier:
        case ts.SyntaxKind.PropertyAccessExpression: {
            var s = tc.getSymbolAtLocation(n);
            if (s == null)
                return undefined;
            if (((s.flags & ts.SymbolFlags.Alias) !== 0) && n.kind === ts.SyntaxKind.PropertyAccessExpression) {
                if (s.declarations.length !== 1)
                    return undefined;
                var decl = s.declarations[0];
                return evalNode(decl, tc, resolveStringLiteral);
            }
            else if (((s.flags & ts.SymbolFlags.Alias) !== 0) && n.kind === ts.SyntaxKind.Identifier) {
                if (s.declarations.length !== 1)
                    return undefined;
                var decl = s.declarations[0];
                if (decl.kind !== ts.SyntaxKind.ImportSpecifier)
                    return undefined;
                if (decl.parent && decl.parent.parent && decl.parent.parent.parent && decl.parent.parent.parent.kind === ts.SyntaxKind.ImportDeclaration) {
                    var impdecl = decl.parent.parent.parent;
                    var s2 = tc.getSymbolAtLocation(impdecl.moduleSpecifier);
                    if (s2 && s2.exports[decl.propertyName.text]) {
                        var s3 = s2.exports[decl.propertyName.text];
                        var exportAssign = s3.declarations[0];
                        return evalNode(exportAssign, tc, resolveStringLiteral);
                    }
                }
            }
            else if (((s.flags & ts.SymbolFlags.Property) !== 0) && n.kind === ts.SyntaxKind.PropertyAccessExpression) {
                var obj = evalNode(n.expression, tc, resolveStringLiteral);
                if (typeof obj !== "object")
                    return undefined;
                var name_1 = n.name.text;
                return obj[name_1];
            }
            else if (s.flags & ts.SymbolFlags.Variable) {
                if (s.valueDeclaration.parent.flags & ts.NodeFlags.Const) {
                    return evalNode(s.valueDeclaration.initializer, tc, resolveStringLiteral);
                }
            }
            return undefined;
        }
        case ts.SyntaxKind.TypeAssertionExpression: {
            var nn = n;
            return evalNode(nn.expression, tc, resolveStringLiteral);
        }
        case ts.SyntaxKind.ObjectLiteralExpression: {
            var ole = n;
            var res = {};
            for (var i = 0; i < ole.properties.length; i++) {
                var prop = ole.properties[i];
                if (prop.kind === ts.SyntaxKind.PropertyAssignment && (prop.name.kind === ts.SyntaxKind.Identifier || prop.name.kind === ts.SyntaxKind.StringLiteral)) {
                    var name_2 = prop.name.kind === ts.SyntaxKind.Identifier ? prop.name.text : prop.name.text;
                    res[name_2] = evalNode(prop.initializer, tc, resolveStringLiteral);
                }
            }
            return res;
        }
        default: {
            //console.log((<any>ts).SyntaxKind[n.kind]);
            return undefined;
        }
    }
}
exports.evalNode = evalNode;
