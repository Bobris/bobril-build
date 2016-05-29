"use strict";
let sourceText;
let pos;
let length;
let curLine;
let curCol;
let nextLine;
let nextCol;
let curToken;
let errorMsg;
const EOFToken = -1;
const ErrorToken = -2;
const OpenBracketToken = -3;
const CloseBracketToken = -4;
const HashToken = -5;
function advanceNextToken() {
    curLine = nextLine;
    curCol = nextCol;
    if (pos === length) {
        curToken = EOFToken;
        return;
    }
    var ch = sourceText.charCodeAt(pos++);
    if (ch === 13 || ch === 10) {
        nextLine++;
        nextCol = 1;
        if (ch === 13 && pos < length && sourceText.charCodeAt(pos) === 10) {
            pos++;
        }
        curToken = 13;
        return;
    }
    nextCol++;
    if (ch === 92) {
        if (pos === length) {
            curToken = 92;
            return;
        }
        ch = sourceText.charCodeAt(pos++);
        nextCol++;
        if (ch === 92 || ch === 123 || ch === 125 || ch === 35) {
            curToken = ch;
            return;
        }
        if (ch === 117) {
            if (pos + 4 <= length) {
                let hexcode = sourceText.substr(pos, 4);
                if (/^[0-9a-f]+$/ig.test(hexcode)) {
                    curToken = parseInt(hexcode, 16);
                    pos += 4;
                    nextCol += 4;
                    return;
                }
            }
            errorMsg = 'After \\u there must be 4 hex characters';
            curToken = ErrorToken;
            return;
        }
        errorMsg = 'After \\ there coud be only one of \\{}#u characters';
        curToken = ErrorToken;
        return;
    }
    if (ch === 123) {
        curToken = OpenBracketToken;
    }
    else if (ch === 125) {
        curToken = CloseBracketToken;
    }
    else if (ch === 35) {
        curToken = HashToken;
    }
    else {
        curToken = ch;
    }
}
function isError(val) {
    return (val != null && typeof val === 'object' && val.type === 'error');
}
function buildError(msg) {
    if (msg === undefined)
        msg = errorMsg;
    return { type: 'error', msg: msg, pos: pos - 1, line: curLine, col: curCol };
}
function skipWs() {
    while (curToken === 9 || curToken === 10 || curToken === 13 || curToken === 32) {
        advanceNextToken();
    }
}
function parseIdentificator() {
    let identificator = '';
    if (curToken >= 65 && curToken <= 90 || curToken >= 97 && curToken <= 122 || curToken === 95) {
        do {
            identificator += String.fromCharCode(curToken);
            advanceNextToken();
        } while (curToken >= 65 && curToken <= 90 || curToken >= 97 && curToken <= 122 || curToken === 95 || curToken >= 48 && curToken <= 57);
    }
    else {
        return buildError('Expecting identifier [a-zA-Z_]');
    }
    return identificator;
}
function parseChars() {
    let res = '';
    do {
        res += String.fromCharCode(curToken);
        advanceNextToken();
    } while (curToken >= 0 && curToken !== 9 && curToken !== 10 && curToken !== 13 && curToken !== 32);
    return res;
}
function parseNumber() {
    let number = '';
    do {
        number += String.fromCharCode(curToken);
        advanceNextToken();
    } while (curToken >= 48 && curToken <= 57);
    return parseInt(number, 10);
}
function parseFormat() {
    skipWs();
    if (curToken === ErrorToken)
        return buildError();
    let identificator = parseIdentificator();
    if (isError(identificator))
        return identificator;
    skipWs();
    if (curToken === ErrorToken)
        return buildError();
    if (curToken === CloseBracketToken) {
        advanceNextToken();
        return { type: 'arg', id: identificator };
    }
    if (curToken !== 44) {
        return buildError('Expecting "}" or ","');
    }
    advanceNextToken();
    skipWs();
    let format = { type: undefined };
    let res = {
        type: 'format',
        id: identificator,
        format: format
    };
    let name = parseIdentificator();
    if (isError(name))
        return name;
    skipWs();
    if (curToken === ErrorToken)
        return buildError();
    if (name === 'number' || name === 'time' || name === 'date') {
        format.type = name;
        format.style = null;
        format.options = null;
        if (curToken === CloseBracketToken) {
            advanceNextToken();
            return res;
        }
        if (curToken === 44) {
            advanceNextToken();
            skipWs();
            let style = parseIdentificator();
            if (isError(style))
                return name;
            format.style = style;
            format.options = [];
            while (true) {
                skipWs();
                if (curToken === ErrorToken)
                    return buildError();
                if (curToken === CloseBracketToken) {
                    advanceNextToken();
                    return res;
                }
                if (curToken === 44) {
                    advanceNextToken();
                    skipWs();
                    let optionName = parseIdentificator();
                    if (isError(optionName))
                        return optionName;
                    if (curToken === 58) {
                        advanceNextToken();
                        skipWs();
                        let val;
                        if (curToken >= 48 && curToken <= 57) {
                            val = parseNumber();
                        }
                        else if (curToken === OpenBracketToken) {
                            advanceNextToken();
                            val = parseMsg(false);
                        }
                        else {
                            val = parseIdentificator();
                        }
                        if (isError(val))
                            return val;
                        format.options.push({ key: optionName, value: val });
                    }
                    else {
                        format.options.push({ key: optionName });
                    }
                    continue;
                }
                break;
            }
        }
        return buildError('Expecting "," or "}"');
    }
    else if (name === 'plural' || name === 'selectordinal') {
        let options = [];
        format.type = 'plural';
        format.ordinal = name !== 'plural';
        format.offset = 0;
        format.options = options;
        if (curToken !== 44) {
            return buildError('Expecting ","');
        }
        advanceNextToken();
        skipWs();
        let offsetAllowed = true;
        while (curToken !== CloseBracketToken) {
            if (curToken < 0) {
                return buildError('Expecting characters except "{", "#"');
            }
            let chars = parseChars();
            skipWs();
            if (offsetAllowed && /^offset:/.test(chars)) {
                let m = /^offset:*([0-9]+)$/.exec(chars);
                if (m) {
                    format.offset = parseInt(m[1], 10);
                }
                else if (chars === 'offset:') {
                    skipWs();
                    if (curToken < 48 || curToken > 57) {
                        return buildError('Expecting number');
                    }
                    format.offset = parseInt(parseNumber(), 10);
                }
                else
                    return buildError('After "offset:" there must be number');
                offsetAllowed = false;
                continue;
            }
            offsetAllowed = false;
            let selector;
            if (/^=[0-9]+$/.test(chars)) {
                selector = parseInt(chars.substring(1), 10);
            }
            else {
                selector = chars;
            }
            if (curToken !== OpenBracketToken) {
                return buildError('Expecting "{"');
            }
            advanceNextToken();
            let value = parseMsg(false);
            if (isError(value))
                return value;
            options.push({ selector: selector, value: value });
            skipWs();
        }
        advanceNextToken();
        return res;
    }
    else if (name === 'select') {
        let options = [];
        format.type = 'select';
        format.options = options;
        if (curToken !== 44) {
            return buildError('Expecting ","');
        }
        advanceNextToken();
        skipWs();
        while (curToken !== CloseBracketToken) {
            if (curToken < 0) {
                return buildError('Expecting characters except "{", "#"');
            }
            let chars = parseChars();
            skipWs();
            let selector;
            if (/^=[0-9]+$/.test(chars)) {
                selector = parseInt(chars.substring(1), 10);
            }
            else {
                selector = chars;
            }
            if (curToken !== OpenBracketToken) {
                return buildError('Expecting "{"');
            }
            advanceNextToken();
            let value = parseMsg(false);
            if (isError(value))
                return value;
            options.push({ selector: selector, value: value });
            skipWs();
        }
        advanceNextToken();
        return res;
    }
    return buildError('Expecting one of "number", "time", "date", "plural", "selectordinal", "select".');
}
function parseMsg(endWithEOF) {
    let res = null;
    while (true) {
        if (curToken === ErrorToken) {
            return buildError();
        }
        if (curToken === EOFToken) {
            if (endWithEOF) {
                if (res === null)
                    return '';
                return res;
            }
            return buildError('Unexpected end of message missing "}"');
        }
        let val;
        if (curToken === OpenBracketToken) {
            advanceNextToken();
            val = parseFormat();
        }
        else if (curToken === HashToken) {
            advanceNextToken();
            val = { type: 'hash' };
        }
        else if (curToken === CloseBracketToken) {
            if (endWithEOF) {
                return buildError('Unexpected "}". Maybe you forgot to prefix it with "\\".');
            }
            advanceNextToken();
            if (res === null)
                return '';
            return res;
        }
        else {
            val = '';
            while (curToken >= 0) {
                val += String.fromCharCode(curToken);
                advanceNextToken();
            }
        }
        if (isError(val))
            return val;
        if (res === null)
            res = val;
        else {
            if (Array.isArray(res)) {
                res.push(val);
            }
            else {
                res = [res, val];
            }
        }
    }
}
function parse(text) {
    pos = 0;
    sourceText = text;
    length = text.length;
    nextLine = 1;
    nextCol = 1;
    advanceNextToken();
    return parseMsg(true);
}
exports.parse = parse;
//# sourceMappingURL=msgFormatParser.js.map