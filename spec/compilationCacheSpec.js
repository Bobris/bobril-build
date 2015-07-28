var CompilationCache = require('../src/compilationCache');
var ts = require("typescript");
var path = require("path");
describe("compilationCache", function () {
    it("works", function () {
        var cc = new CompilationCache.CompilationCache();
        cc.compile({
            dir: path.join(__dirname, 'cc'),
            main: 'app.ts',
            options: { module: 1 /* CommonJS */, target: 1 /* ES5 */ },
            debugStyleDefs: true,
            releaseStyleDefs: false
        });
    });
});
