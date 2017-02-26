import * as ts from "typescript";
export declare function evalNode(n: ts.Node, tc: ts.TypeChecker, resolveStringLiteral: (sl: ts.StringLiteral) => string): any;
