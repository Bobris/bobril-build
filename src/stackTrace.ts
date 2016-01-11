import { StackFrame } from 'stackframe';
import { parse as stackErrorParse } from 'error-stack-parser';
import * as sourceMap from './sourceMap';

export function parseStack(stack: string) {
    return stackErrorParse({ stack });
}

export function enhanceStack(stack: StackFrame[], get: (loc: string) => Buffer, sourceMapCache: { [loc: string]: sourceMap.SourceMap }): StackFrame[] {
    let smCache = sourceMapCache || Object.create(null);

    function getSourceMap(loc: string): sourceMap.SourceMap {
        let res = smCache[loc];
        if (res !== undefined)
            return res;
        let content = get(loc);
        if (content) {
            res = sourceMap.parseSourceMap(content);
        } else {
            res = null;
        }
        smCache[loc] = res;
        return res;
    }

    return stack.map((frame) => {
        let smLoc = frame.fileName + ".map";
        let sm = getSourceMap(smLoc);
        if (sm) {
            let betterPos = sourceMap.findPosition(sm, frame.lineNumber, frame.columnNumber);
            if (betterPos.sourceName) {
                frame.fileName = betterPos.sourceName;
                frame.lineNumber = betterPos.line;
                frame.columnNumber = betterPos.col;
            }
        }
        return frame;
    });
}
