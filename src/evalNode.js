var ts = require("typescript");
function evalNode(n, tc, resolveStringLiteral) {
    switch (n.kind) {
        case 8 /* StringLiteral */: {
            var nn = n;
            if (resolveStringLiteral) {
                return resolveStringLiteral(nn);
            }
            return nn.text;
        }
        case 7 /* NumericLiteral */: {
            var nn = n;
            return parseFloat(nn.text);
        }
        case 95 /* TrueKeyword */: return true;
        case 80 /* FalseKeyword */: return false;
        case 89 /* NullKeyword */: return null;
        case 167 /* PrefixUnaryExpression */: {
            var nn = n;
            var operand = evalNode(nn.operand, tc, resolveStringLiteral);
            if (operand !== undefined) {
                var op = null;
                switch (nn.operator) {
                    case 33 /* PlusToken */:
                        op = "+";
                        break;
                    case 34 /* MinusToken */:
                        op = "-";
                        break;
                    case 47 /* TildeToken */:
                        op = "~";
                        break;
                    case 46 /* ExclamationToken */:
                        op = "!";
                        break;
                    default: return undefined;
                }
                var f = new Function("a", "return " + op + "a");
                return f(operand);
            }
            return undefined;
        }
        case 169 /* BinaryExpression */: {
            var nn = n;
            var left = evalNode(nn.left, tc, resolveStringLiteral);
            var right = evalNode(nn.right, tc, null);
            if (left !== undefined && right !== undefined) {
                var op = null;
                switch (nn.operatorToken.kind) {
                    case 49 /* BarBarToken */:
                    case 48 /* AmpersandAmpersandToken */:
                    case 44 /* BarToken */:
                    case 45 /* CaretToken */:
                    case 43 /* AmpersandToken */:
                    case 28 /* EqualsEqualsToken */:
                    case 29 /* ExclamationEqualsToken */:
                    case 30 /* EqualsEqualsEqualsToken */:
                    case 31 /* ExclamationEqualsEqualsToken */:
                    case 24 /* LessThanToken */:
                    case 25 /* GreaterThanToken */:
                    case 26 /* LessThanEqualsToken */:
                    case 27 /* GreaterThanEqualsToken */:
                    case 87 /* InstanceOfKeyword */:
                    case 86 /* InKeyword */:
                    case 40 /* LessThanLessThanToken */:
                    case 41 /* GreaterThanGreaterThanToken */:
                    case 42 /* GreaterThanGreaterThanGreaterThanToken */:
                    case 33 /* PlusToken */:
                    case 34 /* MinusToken */:
                    case 35 /* AsteriskToken */:
                    case 36 /* SlashToken */:
                    case 37 /* PercentToken */:
                        op = nn.operatorToken.getText();
                        break;
                    default: return undefined;
                }
                var f = new Function("a", "b", "return a " + op + " b");
                return f(left, right);
            }
            return undefined;
        }
        case 170 /* ConditionalExpression */: {
            var nn = n;
            var cond = evalNode(nn.condition, tc, null);
            if (cond === undefined)
                return undefined;
            var e = cond ? nn.whenTrue : nn.whenFalse;
            return evalNode(e, tc, resolveStringLiteral);
        }
        case 65 /* Identifier */:
        case 155 /* PropertyAccessExpression */: {
            var s = tc.getSymbolAtLocation(n);
            if (s.flags & 3 /* Variable */) {
                if (s.valueDeclaration.parent.flags & 8192 /* Const */) {
                    return evalNode(s.valueDeclaration.initializer, tc, resolveStringLiteral);
                }
            }
            return undefined;
        }
        case 160 /* TypeAssertionExpression */: {
            var nn = n;
            return evalNode(nn.expression, tc, resolveStringLiteral);
        }
        case 154 /* ObjectLiteralExpression */: {
            var ole = n;
            var res = {};
            for (var i = 0; i < ole.properties.length; i++) {
                var prop = ole.properties[i];
                if (prop.kind === 224 /* PropertyAssignment */ && (prop.name.kind === 65 /* Identifier */ || prop.name.kind === 8 /* StringLiteral */)) {
                    var name_1 = prop.name.kind === 65 /* Identifier */ ? prop.name.text : prop.name.text;
                    res[name_1] = evalNode(prop.initializer, tc, resolveStringLiteral);
                }
            }
            return res;
        }
        default: return undefined;
    }
}
exports.evalNode = evalNode;
