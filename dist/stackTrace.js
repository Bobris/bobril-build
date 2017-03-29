"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_stack_parser_1 = require("error-stack-parser");
const sourceMap = require("./sourceMap");
function parseStack(stack) {
    return error_stack_parser_1.parse({ stack });
}
exports.parseStack = parseStack;
function enhanceStack(stack, get, sourceMapCache) {
    let smCache = sourceMapCache || Object.create(null);
    function getSourceMap(loc) {
        let res = smCache[loc];
        if (res !== undefined)
            return res;
        let content = get(loc);
        if (content) {
            res = sourceMap.parseSourceMap(content);
        }
        else {
            res = null;
        }
        smCache[loc] = res;
        return res;
    }
    return stack.map((frame) => {
        let smLoc = frame.fileName + ".map";
        let sm = getSourceMap(smLoc);
        if (sm) {
            let key = smLoc + ":" + frame.lineNumber + ":" + frame.columnNumber;
            let cached = smCache[key];
            if (cached === undefined) {
                cached = sourceMap.findPosition(sm, frame.lineNumber, frame.columnNumber);
                smCache[key] = cached;
            }
            if (cached.sourceName) {
                frame.fileName = cached.sourceName;
                frame.lineNumber = cached.line;
                frame.columnNumber = cached.col;
            }
        }
        return frame;
    });
}
exports.enhanceStack = enhanceStack;
//# sourceMappingURL=stackTrace.js.map