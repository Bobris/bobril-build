"use strict";
var dynamicBuffer_1 = require("./dynamicBuffer");
var XmlWritter = (function () {
    function XmlWritter(humanReadable) {
        if (humanReadable === void 0) { humanReadable = false; }
        this.humanReadable = humanReadable;
        this.buf = new dynamicBuffer_1.DynamicBuffer();
        this.inElement = false;
        this.wasEndElement = true;
        this.shouldWriteNL = false;
        this.preserveSpaces = false;
        this.elementStack = [];
        this.preserveStack = [];
    }
    XmlWritter.prototype.getBuffer = function () {
        return this.buf.toBuffer();
    };
    XmlWritter.prototype.addNewLine = function () {
        if (this.humanReadable)
            this.buf.addByte(10);
    };
    XmlWritter.prototype.flushElementBegin = function () {
        if (this.inElement) {
            this.inElement = false;
            this.buf.addByte(62); // ">"
        }
    };
    XmlWritter.prototype.writeHeader = function () {
        this.buf.addString("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
        this.addNewLine();
    };
    XmlWritter.prototype.beginElement = function (elementName) {
        if (this.shouldWriteNL) {
            this.shouldWriteNL = false;
            this.addNewLine();
        }
        if (this.inElement) {
            this.buf.addByte(62); // ">"
        }
        if (!this.preserveSpaces && this.humanReadable) {
            if (this.inElement || !this.wasEndElement) {
                this.buf.addByte(10);
            }
            this.indent(this.elementStack.length);
        }
        this.inElement = true;
        this.wasEndElement = false;
        this.elementStack.push(elementName);
        this.preserveStack.push(this.preserveSpaces);
        this.buf.addByte(60); // "<"
        this.buf.addString(elementName);
    };
    XmlWritter.prototype.beginElementPreserveSpaces = function (elementName, preserveSpaces) {
        this.preserveSpaces = preserveSpaces;
        this.beginElement(elementName);
        if (preserveSpaces)
            this.buf.addString(" xml:space=\"preserve\"");
        else
            this.buf.addString(" xml:space=\"default\"");
    };
    XmlWritter.prototype.endElement = function () {
        if (this.inElement) {
            this.buf.addString("/>");
            this.inElement = false;
            this.wasEndElement = true;
        }
        else {
            if (this.shouldWriteNL && (this.wasEndElement || this.inElement)) {
                this.shouldWriteNL = false;
                this.addNewLine();
            }
            if (this.wasEndElement) {
                if (!this.preserveSpaces && this.humanReadable)
                    this.indent(this.elementStack.length - 1);
            }
            else {
                this.wasEndElement = true;
            }
            this.buf.addString("</");
            this.buf.addString(this.elementStack[this.elementStack.length - 1]);
            this.buf.addByte(62); // ">"
        }
        this.elementStack.pop();
        this.preserveStack.pop();
        if (this.elementStack.length == 0 && !this.preserveSpaces) {
            this.shouldWriteNL = false;
            this.addNewLine();
        }
        else {
            this.preserveSpaces = this.preserveStack.length == 0 ? false : this.preserveStack[this.preserveStack.length - 1];
            this.shouldWriteNL = !this.preserveSpaces;
        }
    };
    XmlWritter.prototype.addAttribute = function (name, value) {
        if (!this.inElement)
            throw new Error("addAttribute outside of element");
        if (name == "xml:space") {
            if (value == "preserve") {
                if (this.preserveSpaces)
                    return;
                else
                    this.preserveSpaces = true;
            }
            else if (value == "default") {
                if (!this.preserveSpaces)
                    return;
                else
                    this.preserveSpaces = false;
            }
        }
        this.buf.addByte(32); // " "
        this.buf.addString(name);
        this.buf.addString("=\"");
        this.translateString(value, true);
        this.buf.addByte(34); // '"'
    };
    XmlWritter.prototype.addPCData = function (data) {
        if (this.shouldWriteNL) {
            this.shouldWriteNL = false;
        }
        this.wasEndElement = false;
        if (data) {
            if (this.inElement) {
                if (!this.preserveSpaces && (data.charCodeAt(0) <= 32 || data.charCodeAt(data.length - 1) <= 32)) {
                    this.preserveSpaces = true;
                    this.preserveStack[this.preserveStack.length - 1] = true;
                    this.buf.addString(" xml:space=\"preserve\"");
                }
                this.inElement = false;
                this.buf.addByte(62); // ">"
            }
            this.translateString(data, false);
        }
    };
    XmlWritter.prototype.addXMLFragment = function (text) {
        this.flushElementBegin();
        this.buf.addString(text);
    };
    XmlWritter.prototype.indent = function (level) {
        this.buf.addSpaces(level * 2);
    };
    XmlWritter.prototype.translateString = function (text, isAttr) {
        var len = text.length;
        var lastIndex = 0;
        for (var i = 0; i < len; i++) {
            var c = text.charCodeAt(i);
            if (c == 60) {
                if (i - lastIndex > 0) {
                    this.buf.addString(text.substr(lastIndex, i - lastIndex));
                }
                this.buf.addString("&lt;");
                lastIndex = i + 1;
            }
            else if (c == 38) {
                if (i - lastIndex > 0) {
                    this.buf.addString(text.substr(lastIndex, i - lastIndex));
                }
                this.buf.addString("&amp;");
                lastIndex = i + 1;
            }
            else if (c == 62) {
                if (i - lastIndex > 0) {
                    this.buf.addString(text.substr(lastIndex, i - lastIndex));
                }
                this.buf.addString("&gt;");
                lastIndex = i + 1;
            }
            else if (isAttr) {
                if (c < 0x20) {
                    var str = c.toString(16);
                    if (i - lastIndex > 0) {
                        this.buf.addString(text.substr(lastIndex, i - lastIndex));
                    }
                    this.buf.addString("&#x" + str + ";");
                    lastIndex = i + 1;
                }
                else if (c == 34) {
                    if (i - lastIndex > 0) {
                        this.buf.addString(text.substr(lastIndex, i - lastIndex));
                    }
                    this.buf.addString("&quot;");
                    lastIndex = i + 1;
                }
            }
        }
        if (lastIndex == 0)
            this.buf.addString(text);
        else if (len - lastIndex > 0) {
            this.buf.addString(text.substr(lastIndex));
        }
    };
    return XmlWritter;
}());
exports.XmlWritter = XmlWritter;
