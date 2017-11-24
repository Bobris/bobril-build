/// <reference types="node" />
export declare const charToInteger: Buffer;
export declare const integerToChar: Buffer;
export declare class DynamicBuffer {
    private buffer;
    private size;
    constructor();
    ensureCapacity(capacity: number): void;
    addByte(b: number): void;
    addSpaces(count: number): void;
    addVLQ(num: number): void;
    addString(s: string): void;
    addBuffer(b: Buffer): void;
    toBuffer(): Buffer;
}
