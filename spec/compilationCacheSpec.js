var compilationCache = require('../src/compilationCache');
var bobrilDepsHelpers = require('../src/bobrilDepsHelpers');
var ts = require("typescript");
var path = require("path");
var fs = require("fs");
function mkpathsync(dirpath) {
    dirpath = path.resolve(dirpath);
    try {
        if (!fs.statSync(dirpath).isDirectory()) {
            throw new Error(dirpath + ' exists and is not a directory');
        }
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            mkpathsync(path.dirname(dirpath));
            fs.mkdirSync(dirpath);
        }
        else {
            throw err;
        }
    }
}
;
describe("compilationCache", function () {
    it("works", function (done) {
        var cc = new compilationCache.CompilationCache();
        function write(fn, b) {
            var dir = path.dirname(path.join(__dirname, 'ccout', fn));
            mkpathsync(dir);
            fs.writeFileSync(path.join(__dirname, 'ccout', fn), b);
        }
        cc.compile({
            dir: path.join(__dirname, 'cc'),
            main: 'app.ts',
            options: { module: 1 /* CommonJS */, target: 1 /* ES5 */ },
            debugStyleDefs: true,
            releaseStyleDefs: false,
            spriteMerge: true,
            writeFileCallback: write
        }).then(function () {
            bobrilDepsHelpers.writeSystemJsBasedDist(write, 'app.js');
        }).then(done);
    });
});
