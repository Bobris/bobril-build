"use strict";
var error_stack_parser_1 = require('error-stack-parser');
var sourceMap = require('./sourceMap');
function parseStack(stack) {
    return error_stack_parser_1.parse({ stack: stack });
}
exports.parseStack = parseStack;
function enhanceStack(stack, get, sourceMapCache) {
    var smCache = sourceMapCache || Object.create(null);
    function getSourceMap(loc) {
        var res = smCache[loc];
        if (res !== undefined)
            return res;
        var content = get(loc);
        if (content) {
            res = sourceMap.parseSourceMap(content);
        }
        else {
            res = null;
        }
        smCache[loc] = res;
        return res;
    }
    return stack.map(function (frame) {
        var smLoc = frame.fileName + ".map";
        var sm = getSourceMap(smLoc);
        if (sm) {
            var betterPos = sourceMap.findPosition(sm, frame.lineNumber, frame.columnNumber);
            if (betterPos.sourceName) {
                frame.fileName = betterPos.sourceName;
                frame.lineNumber = betterPos.line;
                frame.columnNumber = betterPos.col;
            }
        }
        return frame;
    });
}
exports.enhanceStack = enhanceStack;
