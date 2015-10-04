import * as ts from "typescript";
import * as fs from "fs";
import * as compilationCache from '../src/compilationCache';
import * as translationCache from '../src/translationCache';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as pathUtils from '../src/pathUtils';

describe("bundler", () => {
    let testpath = path.join(__dirname.replace(/\\/g, "/"), "bundle");
    let di = fs.readdirSync(testpath).sort();
    try { fs.mkdirSync(path.join(testpath, "_accept")); } catch (err) { };
    try { fs.mkdirSync(path.join(testpath, "_expected")); } catch (err) { };
    di.forEach(n=> {
        if (n[0] === ".") return;
        if (n[0] === "_") return;
        it(n, (done) => {
            var full = path.join(testpath, n);
            var cc = new compilationCache.CompilationCache();
            function write(fn: string, b: Buffer) {
                let dir = path.join(testpath,'_accept',n);
                pathUtils.mkpathsync(dir);
                fs.writeFileSync(path.join(dir, fn), b);
            }
            let project: compilationCache.IProject = {
                dir: full,
                main: 'main.ts',
                options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5 },
                totalBundle: true,
                writeFileCallback: write
            };
            cc.compile(project).then(() => {
            }).then(done, e=> {
                fail(e);
                done();
            });
        });
    });
});
