"use strict";
var emptySourceMap = { version: 3, sources: [], mappings: new Buffer(0) };
var charToInteger = new Buffer(256);
var integerToChar = new Buffer(64);
charToInteger.fill(255);
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('').forEach(function (char, i) {
    charToInteger[char.charCodeAt(0)] = i;
    integerToChar[i] = char.charCodeAt(0);
});
var DynamicBuffer = (function () {
    function DynamicBuffer() {
        this.buffer = new Buffer(512);
        this.size = 0;
    }
    DynamicBuffer.prototype.ensureCapacity = function (capacity) {
        if (this.buffer.length >= capacity)
            return;
        var oldBuffer = this.buffer;
        this.buffer = new Buffer(Math.max(oldBuffer.length * 2, capacity));
        oldBuffer.copy(this.buffer);
    };
    DynamicBuffer.prototype.addByte = function (b) {
        this.ensureCapacity(this.size + 1);
        this.buffer[this.size++] = b;
    };
    DynamicBuffer.prototype.addVLQ = function (num) {
        var clamped;
        if (num < 0) {
            num = (-num << 1) | 1;
        }
        else {
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
    };
    DynamicBuffer.prototype.addString = function (s) {
        var l = Buffer.byteLength(s);
        this.ensureCapacity(this.size + l);
        this.buffer.write(s, this.size);
        this.size += l;
    };
    DynamicBuffer.prototype.addBuffer = function (b) {
        this.ensureCapacity(this.size + b.length);
        b.copy(this.buffer, this.size);
        this.size += b.length;
    };
    DynamicBuffer.prototype.toBuffer = function () {
        return this.buffer.slice(0, this.size);
    };
    return DynamicBuffer;
}());
function countNL(b) {
    var res = 0;
    for (var i = 0; i < b.length; i++) {
        if (b[i] === 10)
            res++;
    }
    return res;
}
var SourceMapBuilder = (function () {
    function SourceMapBuilder() {
        this.lastSourceIndex = 0;
        this.lastSourceLine = 0;
        this.lastSourceCol = 0;
        this.outputBuffer = new DynamicBuffer();
        this.mappings = new DynamicBuffer();
        this.sources = [];
    }
    SourceMapBuilder.prototype.addLine = function (text) {
        this.outputBuffer.addString(text);
        this.outputBuffer.addByte(10);
        this.mappings.addByte(59); // ;
    };
    SourceMapBuilder.prototype.addSource = function (content, sourceMap) {
        var _this = this;
        if (sourceMap == null)
            sourceMap = emptySourceMap;
        this.outputBuffer.addBuffer(content);
        var sourceLines = countNL(content);
        if (content.length > 0 && content[content.length - 1] !== 10) {
            sourceLines++;
            this.outputBuffer.addByte(10);
        }
        var sourceRemap = [];
        sourceMap.sources.forEach(function (v) {
            var pos = _this.sources.indexOf(v);
            if (pos < 0) {
                pos = _this.sources.length;
                _this.sources.push(v);
            }
            sourceRemap.push(pos);
        });
        var lastOutputCol = 0;
        var inputMappings = (typeof sourceMap.mappings === "string") ? new Buffer(sourceMap.mappings) : sourceMap.mappings;
        var outputLine = 0;
        var ip = 0;
        var inOutputCol = 0;
        var inSourceIndex = 0;
        var inSourceLine = 0;
        var inSourceCol = 0;
        var shift = 0;
        var value = 0;
        var valpos = 0;
        var commit = function () {
            if (valpos === 0)
                return;
            _this.mappings.addVLQ(inOutputCol - lastOutputCol);
            lastOutputCol = inOutputCol;
            if (valpos === 1) {
                valpos = 0;
                return;
            }
            var outSourceIndex = sourceRemap[inSourceIndex];
            _this.mappings.addVLQ(outSourceIndex - _this.lastSourceIndex);
            _this.lastSourceIndex = outSourceIndex;
            _this.mappings.addVLQ(inSourceLine - _this.lastSourceLine);
            _this.lastSourceLine = inSourceLine;
            _this.mappings.addVLQ(inSourceCol - _this.lastSourceCol);
            _this.lastSourceCol = inSourceCol;
            valpos = 0;
        };
        while (ip < inputMappings.length) {
            var b = inputMappings[ip++];
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
                b = charToInteger[b];
                if (b === 255)
                    throw new Error("Invalid sourceMap");
                value += (b & 31) << shift;
                if (b & 32) {
                    shift += 5;
                }
                else {
                    var shouldNegate = value & 1;
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
    };
    SourceMapBuilder.prototype.toContent = function () {
        return this.outputBuffer.toBuffer();
    };
    SourceMapBuilder.prototype.toSourceMap = function (sourceRoot) {
        return new Buffer(JSON.stringify({ version: 3, sourceRoot: sourceRoot, sources: this.sources, mappings: this.mappings.toBuffer().toString() }));
    };
    return SourceMapBuilder;
}());
exports.SourceMapBuilder = SourceMapBuilder;
