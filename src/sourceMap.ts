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

var charToInteger = new Buffer(256);
var integerToChar = new Buffer(64);

charToInteger.fill(255);

'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('').forEach((char, i) => {
    charToInteger[char.charCodeAt(0)] = i;
    integerToChar[i] = char.charCodeAt(0);
});

class DynamicBuffer {
    buffer: Buffer;
    size: number;

    constructor() {
        this.buffer = new Buffer(512);
        this.size = 0;
    }

    ensureCapacity(capacity: number) {
        if (this.buffer.length >= capacity)
            return;
        let oldBuffer = this.buffer;
        this.buffer = new Buffer(Math.max(oldBuffer.length * 2, capacity));
        oldBuffer.copy(this.buffer);
    }

    addByte(b: number) {
        this.ensureCapacity(this.size + 1);
        this.buffer[this.size++] = b;
    }

    addVLQ(num: number) {
        var clamped: number;

        if (num < 0) {
            num = (-num << 1) | 1;
        } else {
            num <<= 1;
        }

        do {
            clamped = num & 31;
            num >>= 5;

            if (num > 0) {
                clamped |= 32;
            }

            this.addByte(integerToChar[clamped]);
        } while (num > 0);
    }

    addString(s: string) {
        let l = Buffer.byteLength(s);
        this.ensureCapacity(this.size + l);
        this.buffer.write(s, this.size);
        this.size += l;
    }

    addBuffer(b: Buffer) {
        this.ensureCapacity(this.size + b.length);
        b.copy(this.buffer, this.size);
        this.size += b.length;
    }

    toBuffer(): Buffer {
        return this.buffer.slice(0, this.size);
    }
}

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

    toSourceMap(sourceRoot?: string): Buffer {
        return new Buffer(JSON.stringify({ version: 3, sourceRoot, sources: this.sources, mappings: this.mappings.toBuffer().toString() }));
    }
}
