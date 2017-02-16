import { DynamicBuffer } from "./dynamicBuffer";
export interface SourceMap {
    version: number;
    file?: string;
    sourceRoot?: string;
    sources: string[];
    sourcesContent?: string[];
    names?: string[];
    mappings: string | Buffer;
}
export declare class SourceMapBuilder {
    outputBuffer: DynamicBuffer;
    sources: string[];
    mappings: DynamicBuffer;
    lastSourceIndex: number;
    lastSourceLine: number;
    lastSourceCol: number;
    constructor();
    addLine(text: string): void;
    addLines(text: string): void;
    addSource(content: Buffer, sourceMap?: SourceMap): void;
    toContent(): Buffer;
    toSourceMapBuffer(sourceRoot?: string): Buffer;
    toSourceMap(sourceRoot?: string): SourceMap;
}
export declare function parseSourceMap(content: Buffer): SourceMap;
export declare type Position = {
    sourceName?: string;
    line?: number;
    col?: number;
};
export declare function findPosition(sourceMap: SourceMap, line: number, col?: number): Position;
