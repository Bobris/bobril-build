import * as ts from "typescript";
export interface SourceInfo {
    sourceFile: ts.SourceFile;
    sourceDeps: [string, string][];
    bobrilNamespace: string;
    bobrilImports: {
        [name: string]: string;
    };
    bobrilG11NNamespace: string;
    bobrilG11NImports: {
        [name: string]: string;
    };
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
export declare function gatherSourceInfo(source: ts.SourceFile, tc: ts.TypeChecker, resolvePathStringLiteral: (sl: ts.StringLiteral) => string): SourceInfo;
export declare function createNodeFromValue(value: any): ts.Expression;
export declare function setMethod(callExpression: ts.CallExpression, name: string): void;
export declare function setArgumentAst(callExpression: ts.CallExpression, index: number, value: ts.Expression): void;
export declare function buildLambdaReturningArray(values: ts.Expression[]): ts.Expression;
export declare function setArgument(callExpression: ts.CallExpression, index: number, value: any): void;
export declare function setArgumentCount(callExpression: ts.CallExpression, count: number): void;
export declare function rememberCallExpression(callExpression: ts.CallExpression): () => void;
export declare function applyOverrides(overrides: {
    varDecl: ts.VariableDeclaration;
    value: string | number | boolean;
}[]): () => void;
export declare function applyOverridesHarder(overrides: {
    varDecl: ts.VariableDeclaration;
    value: string | number | boolean;
}[]): void;
export declare function rememberParent(expression: ts.Expression): () => void;
export declare function concat(left: ts.Expression, right: ts.Expression): ts.Expression;
