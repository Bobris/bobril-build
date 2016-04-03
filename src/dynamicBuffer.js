"use strict";
exports.charToInteger = new Buffer(256);
exports.integerToChar = new Buffer(64);
exports.charToInteger.fill(255);
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('').forEach(function (char, i) {
    exports.charToInteger[char.charCodeAt(0)] = i;
    exports.integerToChar[i] = char.charCodeAt(0);
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
    DynamicBuffer.prototype.addSpaces = function (count) {
        count = count | 0;
        var s = this.size | 0;
        this.size = s + count;
        this.ensureCapacity(s + count);
        while (count-- > 0) {
            this.buffer[s++] = 32;
        }
    };
    DynamicBuffer.prototype.addVLQ = function (num) {
        num = num | 0;
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
            this.addByte(exports.integerToChar[clamped]);
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
exports.DynamicBuffer = DynamicBuffer;
