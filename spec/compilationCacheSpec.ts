import * as compilationCache from '../src/compilationCache';
import * as translationCache from '../src/translationCache';
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
        var tc = new translationCache.TranslationDb();
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
            writeFileCallback: write,
            textForTranslationReplacer: tc.addUsageOfMessage.bind(tc)
        }).then(() => {
            bobrilDepsHelpers.writeSystemJsBasedDist(write, 'app.js');
            bobrilDepsHelpers.writeTranslationFile('en', tc.getMessageArrayInLang('en'), 'en.js', write);
            tc.addLang('cs-CZ');
            let trs = tc.getForTranslationLang('cs-CZ');
            trs[0][0]='Ahoj';
            trs[1][0]='Právě je {now, date, LLLL}';
            tc.setForTranslationLang('cs-CZ',trs);
            bobrilDepsHelpers.writeTranslationFile('cs-CZ', tc.getMessageArrayInLang('cs-CZ'), 'cs-CZ.js', write);
        }).then(done);
    });
});
