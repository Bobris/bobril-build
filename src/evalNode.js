var ts = require("typescript");
function evalNode(n, tc) {
    switch (n.kind) {
        case 8 /* StringLiteral */: {
            var nn = n;
            return nn.text;
        }
        case 169 /* BinaryExpression */: {
            var nn = n;
            var left = evalNode(nn.left, tc);
            var right = evalNode(nn.right, tc);
            if (nn.operatorToken.kind === 33 /* PlusToken */) {
                if (left !== undefined && right !== undefined) {
                    if (typeof left === "string" && typeof right === "string") {
                        return left + right;
                    }
                }
            }
            return undefined;
        }
        case 65 /* Identifier */: {
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
