import { StackFrame } from 'stackframe';
import * as sourceMap from './sourceMap';
export declare function parseStack(stack: string): StackFrame[];
export declare function enhanceStack(stack: StackFrame[], get: (loc: string) => Buffer, sourceMapCache: {
    [loc: string]: sourceMap.SourceMap;
}): StackFrame[];
