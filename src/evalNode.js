var ts = require("typescript");
function evalNode(n, tc) {
    switch (n.kind) {
        case 8 /* StringLiteral */: {
            var nn = n;
            return nn.text;
        }
        case 7 /* NumericLiteral */: {
            var nn = n;
            return parseFloat(nn.text);
        }
        case 95 /* TrueKeyword */: return true;
        case 80 /* FalseKeyword */: return false;
        case 169 /* BinaryExpression */: {
            var nn = n;
            var left = evalNode(nn.left, tc);
            var right = evalNode(nn.right, tc);
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
        case 65 /* Identifier */:
        case 155 /* PropertyAccessExpression */: {
            var s = tc.getSymbolAtLocation(n);
            if (s.flags & 3 /* Variable */) {
                if (s.valueDeclaration.parent.flags & 8192 /* Const */) {
                    return evalNode(s.valueDeclaration.initializer, tc);
                }
            }
        }
        default: return undefined;
    }
}
exports.evalNode = evalNode;
