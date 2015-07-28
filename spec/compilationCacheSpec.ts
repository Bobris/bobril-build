import * as CompilationCache from '../src/compilationCache';
import * as ts from "typescript";
import * as path from "path";

describe("compilationCache", () => {
    it("works", () => {
        var cc = new CompilationCache.CompilationCache();
        cc.compile({
            dir: path.join(__dirname, 'cc'),
            main: 'app.ts',
            options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5 },
            debugStyleDefs: true,
            releaseStyleDefs: false
        });
    });
});
