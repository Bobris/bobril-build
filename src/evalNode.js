var ts = require("typescript");
function evalNode(n, tc, resolveStringLiteral) {
    switch (n.kind) {
        case 9 /* StringLiteral */: {
            var nn = n;
            if (resolveStringLiteral) {
                return resolveStringLiteral(nn);
            }
            return nn.text;
        }
        case 8 /* NumericLiteral */: {
            var nn = n;
            return parseFloat(nn.text);
        }
        case 97 /* TrueKeyword */: return true;
        case 82 /* FalseKeyword */: return false;
        case 91 /* NullKeyword */: return null;
        case 177 /* PrefixUnaryExpression */: {
            var nn = n;
            var operand = evalNode(nn.operand, tc, resolveStringLiteral);
            if (operand !== undefined) {
                var op = null;
                switch (nn.operator) {
                    case 35 /* PlusToken */:
                        op = "+";
                        break;
                    case 36 /* MinusToken */:
                        op = "-";
                        break;
                    case 49 /* TildeToken */:
                        op = "~";
                        break;
                    case 48 /* ExclamationToken */:
                        op = "!";
                        break;
                    default: return undefined;
                }
                var f = new Function("a", "return " + op + "a");
                return f(operand);
            }
            return undefined;
        }
        case 179 /* BinaryExpression */: {
            var nn = n;
            var left = evalNode(nn.left, tc, resolveStringLiteral);
            var right = evalNode(nn.right, tc, null);
            if (left !== undefined && right !== undefined) {
                var op = null;
                switch (nn.operatorToken.kind) {
                    case 51 /* BarBarToken */:
                    case 50 /* AmpersandAmpersandToken */:
                    case 46 /* BarToken */:
                    case 47 /* CaretToken */:
                    case 45 /* AmpersandToken */:
                    case 30 /* EqualsEqualsToken */:
                    case 31 /* ExclamationEqualsToken */:
                    case 32 /* EqualsEqualsEqualsToken */:
                    case 33 /* ExclamationEqualsEqualsToken */:
                    case 25 /* LessThanToken */:
                    case 27 /* GreaterThanToken */:
                    case 28 /* LessThanEqualsToken */:
                    case 29 /* GreaterThanEqualsToken */:
                    case 89 /* InstanceOfKeyword */:
                    case 88 /* InKeyword */:
                    case 42 /* LessThanLessThanToken */:
                    case 43 /* GreaterThanGreaterThanToken */:
                    case 44 /* GreaterThanGreaterThanGreaterThanToken */:
                    case 35 /* PlusToken */:
                    case 36 /* MinusToken */:
                    case 37 /* AsteriskToken */:
                    case 38 /* SlashToken */:
                    case 39 /* PercentToken */:
                        op = nn.operatorToken.getText();
                        break;
                    default: return undefined;
                }
                var f = new Function("a", "b", "return a " + op + " b");
                return f(left, right);
            }
            return undefined;
        }
        case 180 /* ConditionalExpression */: {
            var nn = n;
            var cond = evalNode(nn.condition, tc, null);
            if (cond === undefined)
                return undefined;
            var e = cond ? nn.whenTrue : nn.whenFalse;
            return evalNode(e, tc, resolveStringLiteral);
        }
        case 67 /* Identifier */:
        case 164 /* PropertyAccessExpression */: {
            var s = tc.getSymbolAtLocation(n);
            if (s.flags & 3 /* Variable */) {
                if (s.valueDeclaration.parent.flags & 32768 /* Const */) {
                    return evalNode(s.valueDeclaration.initializer, tc, resolveStringLiteral);
                }
            }
            return undefined;
        }
        case 169 /* TypeAssertionExpression */: {
            var nn = n;
            return evalNode(nn.expression, tc, resolveStringLiteral);
        }
        case 163 /* ObjectLiteralExpression */: {
            var ole = n;
            var res = {};
            for (var i = 0; i < ole.properties.length; i++) {
                var prop = ole.properties[i];
                if (prop.kind === 243 /* PropertyAssignment */ && (prop.name.kind === 67 /* Identifier */ || prop.name.kind === 9 /* StringLiteral */)) {
                    var name_1 = prop.name.kind === 67 /* Identifier */ ? prop.name.text : prop.name.text;
                    res[name_1] = evalNode(prop.initializer, tc, resolveStringLiteral);
                }
            }
            return res;
        }
        default: return undefined;
    }
}
exports.evalNode = evalNode;
