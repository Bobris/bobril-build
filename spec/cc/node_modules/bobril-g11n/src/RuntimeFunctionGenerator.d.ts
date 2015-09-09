export declare class RuntimeFunctionGenerator {
    constants: any[];
    body: string;
    argCount: number;
    localCount: number;
    addConstant(value: any): string;
    addArg(index: number): string;
    addBody(text: string): void;
    addLocal(): string;
    build(): Function;
}
