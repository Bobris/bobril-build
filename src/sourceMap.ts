import { DynamicBuffer, charToInteger } from "./dynamicBuffer";

export interface SourceMap {
    version: number; // always 3
    file?: string;
    sourceRoot?: string;
    sources: string[];
    sourcesContent?: string[];
    names?: string[];
    mappings: string | Buffer;
}

const emptySourceMap: SourceMap = { version: 3, sources: [], mappings: new Buffer(0) }

function countNL(b: Buffer): number {
    let res = 0;
    for (let i = 0; i < b.length; i++) {
        if (b[i] === 10) res++;
    }
    return res;
}

export class SourceMapBuilder {
    outputBuffer: DynamicBuffer;
    sources: string[];
    mappings: DynamicBuffer;
    lastSourceIndex = 0;
    lastSourceLine = 0;
    lastSourceCol = 0;
    constructor() {
        this.outputBuffer = new DynamicBuffer();
        this.mappings = new DynamicBuffer();
        this.sources = [];
    }

    addLine(text: string) {
        this.outputBuffer.addString(text);
        this.outputBuffer.addByte(10);
        this.mappings.addByte(59); // ;
    }

    addLines(text: string) {
        let lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            this.addLine(lines[i]);
        }
    }

    addSource(content: Buffer, sourceMap?: SourceMap) {
        if (sourceMap == null) sourceMap = emptySourceMap;
        this.outputBuffer.addBuffer(content);
        let sourceLines = countNL(content);
        if (content.length > 0 && content[content.length - 1] !== 10) {
            sourceLines++;
            this.outputBuffer.addByte(10);
        }
        let sourceRemap = [];
        sourceMap.sources.forEach((v) => {
            let pos = this.sources.indexOf(v);
            if (pos < 0) {
                pos = this.sources.length;
                this.sources.push(v);
            }
            sourceRemap.push(pos);
        });
        let lastOutputCol = 0;
        let inputMappings = (typeof sourceMap.mappings === "string") ? new Buffer(<string>sourceMap.mappings) : <Buffer>sourceMap.mappings;
        let outputLine = 0;
        let ip = 0;
        let inOutputCol = 0;
        let inSourceIndex = 0;
        let inSourceLine = 0;
        let inSourceCol = 0;
        let shift = 0;
        let value = 0;
        let valpos = 0;
        const commit = () => {
            if (valpos === 0) return;
            this.mappings.addVLQ(inOutputCol - lastOutputCol);
            lastOutputCol = inOutputCol;
            if (valpos === 1) {
                valpos = 0;
                return;
            }
            let outSourceIndex = sourceRemap[inSourceIndex];
            this.mappings.addVLQ(outSourceIndex - this.lastSourceIndex);
            this.lastSourceIndex = outSourceIndex;
            this.mappings.addVLQ(inSourceLine - this.lastSourceLine);
            this.lastSourceLine = inSourceLine;
            this.mappings.addVLQ(inSourceCol - this.lastSourceCol);
            this.lastSourceCol = inSourceCol;
            valpos = 0;
        }
        while (ip < inputMappings.length) {
            let b = inputMappings[ip++];
            if (b === 59) { // ;
                commit();
                this.mappings.addByte(59);
                inOutputCol = 0;
                lastOutputCol = 0;
                outputLine++;
            } else if (b === 44) { // ,
                commit();
                this.mappings.addByte(44);
            } else {
                b = charToInteger[b];
                if (b === 255) throw new Error("Invalid sourceMap");
                value += (b & 31) << shift;
                if (b & 32) {
                    shift += 5;
                } else {
                    let shouldNegate = value & 1;
                    value >>= 1;
                    if (shouldNegate) value = -value;
                    switch (valpos) {
                        case 0: inOutputCol += value; break;
                        case 1: inSourceIndex += value; break;
                        case 2: inSourceLine += value; break;
                        case 3: inSourceCol += value; break;
                    }
                    valpos++;
                    value = shift = 0;
                }
            }
        }
        commit();
        while (outputLine < sourceLines) {
            this.mappings.addByte(59);
            outputLine++;
        }
    }

    toContent(): Buffer {
        return this.outputBuffer.toBuffer();
    }

    toSourceMapBuffer(sourceRoot?: string): Buffer {
        return new Buffer(JSON.stringify({ version: 3, sourceRoot, sources: this.sources, mappings: this.mappings.toBuffer().toString() }));
    }

    toSourceMap(sourceRoot?: string): SourceMap {
        return { version: 3, sourceRoot, sources: this.sources, mappings: this.mappings.toBuffer() };
    }
}

export function parseSourceMap(content: Buffer): SourceMap {
    let sm = JSON.parse(content.toString()) as SourceMap;
    if (sm.version !== 3) {
        throw Error('Unsupported version of SourceMap');
    }
    sm.mappings = new Buffer(<string>sm.mappings);
    return sm;
}

export function findPosition(sourceMap: SourceMap, line: number, col?: number): { sourceName?: string, line?: number, col?: number } {
    let inputMappings = (typeof sourceMap.mappings === "string") ? new Buffer(<string>sourceMap.mappings) : <Buffer>sourceMap.mappings;
    let outputLine = 1;
    let ip = 0;
    let inOutputCol = 0;
    let inSourceIndex = 0;
    let inSourceLine = 0;
    let inSourceCol = 0;
    let shift = 0;
    let value = 0;
    let valpos = 0;
    let lastOutputCol = 0;
    let lastSourceIndex = 0;
    let lastSourceLine = 0;
    let lastSourceCol = 0;
    let res = { sourceName: null, line: null, col: null };
    const commit = () => {
        if (valpos === 0) return;
        if (outputLine === line && lastOutputCol <= col && col <= inOutputCol) {
            if (lastSourceIndex < 0) return res;
            res.sourceName = sourceMap.sources[inSourceIndex];
            res.line = lastSourceLine + 1;
            res.col = lastSourceCol + col - lastOutputCol;
            return res;
        }
        if (valpos === 1) {
            lastSourceIndex = -1;
        } else {
            lastSourceIndex = inSourceIndex;
            lastSourceLine = inSourceLine;
            lastSourceCol = inSourceCol;
            if (outputLine === line && col == null) {
                res.sourceName = sourceMap.sources[inSourceIndex];
                res.line = inSourceLine + 1;
                res.col = inSourceCol;
                return res;
            }
        }
        lastOutputCol = inOutputCol;
        valpos = 0;
    }
    while (ip < inputMappings.length) {
        let b = inputMappings[ip++];
        if (b === 59) { // ;
            commit();
            inOutputCol = 0;
            outputLine++;
        } else if (b === 44) { // ,
            commit();
        } else {
            b = charToInteger[b];
            if (b === 255) throw new Error("Invalid sourceMap");
            value += (b & 31) << shift;
            if (b & 32) {
                shift += 5;
            } else {
                let shouldNegate = value & 1;
                value >>= 1;
                if (shouldNegate) value = -value;
                switch (valpos) {
                    case 0: inOutputCol += value; break;
                    case 1: inSourceIndex += value; break;
                    case 2: inSourceLine += value; break;
                    case 3: inSourceCol += value; break;
                }
                valpos++;
                value = shift = 0;
            }
        }
    }
    commit();
    return res;
}
