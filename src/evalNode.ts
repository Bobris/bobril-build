import * as ts from "typescript";

export function evalNode(n: ts.Node, tc: ts.TypeChecker): any {
    switch (n.kind) {
        case ts.SyntaxKind.StringLiteral: {
            let nn = <ts.StringLiteral>n;
            return nn.text;
        }
        case ts.SyntaxKind.BinaryExpression: {
            let nn = <ts.BinaryExpression>n;
            let left = evalNode(nn.left, tc);
            let right = evalNode(nn.right, tc);
            if (nn.operatorToken.kind === ts.SyntaxKind.PlusToken) {
                if (left !== undefined && right !== undefined) {
                    if (typeof left === "string" && typeof right === "string") {
                        return left + right;
                    }
                }
            }
            return undefined;
        }
        case ts.SyntaxKind.Identifier: {
            let s = tc.getSymbolAtLocation(n);
            if (s.flags & ts.SymbolFlags.Variable) {
                if (s.valueDeclaration.parent.flags & ts.NodeFlags.Const) {
                    return evalNode((<ts.VariableDeclaration>s.valueDeclaration).initializer, tc);
                }
            }
        }
        default: return undefined;
    }
}
