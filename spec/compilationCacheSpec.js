var compilationCache = require('../src/compilationCache');
var translationCache = require('../src/translationCache');
var bobrilDepsHelpers = require('../src/bobrilDepsHelpers');
var ts = require("typescript");
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require("fs");
var pathUtils = require('../src/pathUtils');
describe("compilationCache", function () {
    it("works", function (done) {
        var cc = new compilationCache.CompilationCache();
        var tc = new translationCache.TranslationDb();
        function write(fn, b) {
            var dir = path.dirname(path.join(__dirname.replace(/\\/g, '/'), 'ccout', fn));
            pathUtils.mkpathsync(dir);
            fs.writeFileSync(path.join(__dirname.replace(/\\/g, '/'), 'ccout', fn), b);
        }
        var project = {
            dir: path.join(__dirname.replace(/\\/g, '/'), 'cc'),
            main: 'app.ts',
            options: { module: 1 /* CommonJS */, target: 1 /* ES5 */ },
            debugStyleDefs: true,
            releaseStyleDefs: false,
            spriteMerge: true,
            writeFileCallback: write,
            textForTranslationReplacer: tc.addUsageOfMessage.bind(tc)
        };
        cc.compile(project).then(function () {
            var moduleNames = Object.keys(project.moduleMap);
            var moduleMap = Object.create(null);
            for (var i = 0; i < moduleNames.length; i++) {
                var name_1 = moduleNames[i];
                if (project.moduleMap[name_1].internalModule)
                    continue;
                moduleMap[name_1] = project.moduleMap[name_1].jsFile;
            }
            bobrilDepsHelpers.writeSystemJsBasedDist(write, 'app.js', moduleMap);
            bobrilDepsHelpers.writeTranslationFile('en', tc.getMessageArrayInLang('en'), 'en.js', write);
            tc.addLang('cs-CZ');
            var trs = tc.getForTranslationLang('cs-CZ');
            trs[0][0] = 'Ahoj';
            trs[1][0] = 'Právě je {now, date, LLLL}';
            tc.setForTranslationLang('cs-CZ', trs);
            bobrilDepsHelpers.writeTranslationFile('cs-CZ', tc.getMessageArrayInLang('cs-CZ'), 'cs-CZ.js', write);
        }).then(done, function (e) {
            fail(e);
            done();
        });
    }, 60000);
});
