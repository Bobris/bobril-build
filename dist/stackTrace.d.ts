import { StackFrame } from 'stackframe';
export declare function parseStack(stack: string): StackFrame[];
export declare function enhanceStack(stack: StackFrame[], get: (loc: string) => Buffer, sourceMapCache: {
    [loc: string]: any;
}): StackFrame[];
