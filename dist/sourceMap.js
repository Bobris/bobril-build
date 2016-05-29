"use strict";
const dynamicBuffer_1 = require("./dynamicBuffer");
const emptySourceMap = { version: 3, sources: [], mappings: new Buffer(0) };
function countNL(b) {
    let res = 0;
    for (let i = 0; i < b.length; i++) {
        if (b[i] === 10)
            res++;
    }
    return res;
}
class SourceMapBuilder {
    constructor() {
        this.lastSourceIndex = 0;
        this.lastSourceLine = 0;
        this.lastSourceCol = 0;
        this.outputBuffer = new dynamicBuffer_1.DynamicBuffer();
        this.mappings = new dynamicBuffer_1.DynamicBuffer();
        this.sources = [];
    }
    addLine(text) {
        this.outputBuffer.addString(text);
        this.outputBuffer.addByte(10);
        this.mappings.addByte(59); // ;
    }
    addSource(content, sourceMap) {
        if (sourceMap == null)
            sourceMap = emptySourceMap;
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
        let inputMappings = (typeof sourceMap.mappings === "string") ? new Buffer(sourceMap.mappings) : sourceMap.mappings;
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
            if (valpos === 0)
                return;
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
        };
        while (ip < inputMappings.length) {
            let b = inputMappings[ip++];
            if (b === 59) {
                commit();
                this.mappings.addByte(59);
                inOutputCol = 0;
                lastOutputCol = 0;
                outputLine++;
            }
            else if (b === 44) {
                commit();
                this.mappings.addByte(44);
            }
            else {
                b = dynamicBuffer_1.charToInteger[b];
                if (b === 255)
                    throw new Error("Invalid sourceMap");
                value += (b & 31) << shift;
                if (b & 32) {
                    shift += 5;
                }
                else {
                    let shouldNegate = value & 1;
                    value >>= 1;
                    if (shouldNegate)
                        value = -value;
                    switch (valpos) {
                        case 0:
                            inOutputCol += value;
                            break;
                        case 1:
                            inSourceIndex += value;
                            break;
                        case 2:
                            inSourceLine += value;
                            break;
                        case 3:
                            inSourceCol += value;
                            break;
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
    toContent() {
        return this.outputBuffer.toBuffer();
    }
    toSourceMapBuffer(sourceRoot) {
        return new Buffer(JSON.stringify({ version: 3, sourceRoot: sourceRoot, sources: this.sources, mappings: this.mappings.toBuffer().toString() }));
    }
    toSourceMap(sourceRoot) {
        return { version: 3, sourceRoot: sourceRoot, sources: this.sources, mappings: this.mappings.toBuffer() };
    }
}
exports.SourceMapBuilder = SourceMapBuilder;
function parseSourceMap(content) {
    let sm = JSON.parse(content.toString());
    if (sm.version !== 3) {
        throw Error('Unsupported version of SourceMap');
    }
    sm.mappings = new Buffer(sm.mappings);
    return sm;
}
exports.parseSourceMap = parseSourceMap;
function findPosition(sourceMap, line, col) {
    let inputMappings = (typeof sourceMap.mappings === "string") ? new Buffer(sourceMap.mappings) : sourceMap.mappings;
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
        if (valpos === 0)
            return;
        if (outputLine === line && lastOutputCol <= col && col <= inOutputCol) {
            if (lastSourceIndex < 0)
                return res;
            res.sourceName = sourceMap.sources[inSourceIndex];
            res.line = lastSourceLine + 1;
            res.col = lastSourceCol + col - lastOutputCol;
            return res;
        }
        if (valpos === 1) {
            lastSourceIndex = -1;
        }
        else {
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
    };
    while (ip < inputMappings.length) {
        let b = inputMappings[ip++];
        if (b === 59) {
            commit();
            inOutputCol = 0;
            outputLine++;
        }
        else if (b === 44) {
            commit();
        }
        else {
            b = dynamicBuffer_1.charToInteger[b];
            if (b === 255)
                throw new Error("Invalid sourceMap");
            value += (b & 31) << shift;
            if (b & 32) {
                shift += 5;
            }
            else {
                let shouldNegate = value & 1;
                value >>= 1;
                if (shouldNegate)
                    value = -value;
                switch (valpos) {
                    case 0:
                        inOutputCol += value;
                        break;
                    case 1:
                        inSourceIndex += value;
                        break;
                    case 2:
                        inSourceLine += value;
                        break;
                    case 3:
                        inSourceCol += value;
                        break;
                }
                valpos++;
                value = shift = 0;
            }
        }
    }
    commit();
    return res;
}
exports.findPosition = findPosition;
//# sourceMappingURL=sourceMap.js.map