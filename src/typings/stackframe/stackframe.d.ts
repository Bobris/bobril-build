declare module "stackframe" {
    export interface StackFrame {
        constructor(functionName: string, args: any[], fileName: string, lineNumber: number, columnNumber: number): StackFrame;

        functionName?: string;
        args?: any[];
        fileName?: string;
        lineNumber?: number;
        columnNumber?: number;
        toString(): string;
    }
}
