import * as compilationCache from '../src/compilationCache';
import * as bobrilDepsHelpers from '../src/bobrilDepsHelpers';
import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

function mkpathsync(dirpath) {
    dirpath = path.resolve(dirpath);
    try {
        if (!fs.statSync(dirpath).isDirectory()) {
            throw new Error(dirpath + ' exists and is not a directory');
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            mkpathsync(path.dirname(dirpath));
            fs.mkdirSync(dirpath);
        } else {
            throw err;
        }
    }
};

describe("compilationCache", () => {
    it("works", (done) => {
        var cc = new compilationCache.CompilationCache();
        function write(fn: string, b: Buffer) {
            let dir = path.dirname(path.join(__dirname, 'ccout', fn));
            mkpathsync(dir);
            fs.writeFileSync(path.join(__dirname, 'ccout', fn), b);
        }
        cc.compile({
            dir: path.join(__dirname, 'cc'),
            main: 'app.ts',
            options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5 },
            debugStyleDefs: true,
            releaseStyleDefs: false,
            spriteMerge: true,
            writeFileCallback: write
        }).then(()=>{
            bobrilDepsHelpers.writeSystemJsBasedDist(write,'app.js');
        }).then(done);
    });
});
