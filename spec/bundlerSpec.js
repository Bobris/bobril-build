"use strict";
var ts = require("typescript");
var fs = require("fs");
var compilationCache = require('../src/compilationCache');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var pathUtils = require('../src/pathUtils');
describe("bundler", function () {
    var testpath = path.join(__dirname.replace(/\\/g, "/"), "bundle");
    var di = fs.readdirSync(testpath).sort();
    try {
        fs.mkdirSync(path.join(testpath, "_accept"));
    }
    catch (err) { }
    ;
    try {
        fs.mkdirSync(path.join(testpath, "_expect"));
    }
    catch (err) { }
    ;
    di.forEach(function (n) {
        if (n[0] === ".")
            return;
        if (n[0] === "_")
            return;
        it(n, function (done) {
            var full = path.join(testpath, n);
            var cc = new compilationCache.CompilationCache();
            function write(fn, b) {
                var dir = path.join(testpath, '_accept', n);
                pathUtils.mkpathsync(dir);
                fs.writeFileSync(path.join(dir, fn), b);
            }
            var project = {
                dir: full,
                main: 'main.ts',
                options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5 },
                totalBundle: true,
                writeFileCallback: write
            };
            cc.compile(project).then(function () {
                var acc = path.join(testpath, '_accept', n);
                var exp = path.join(testpath, '_expect', n);
                pathUtils.mkpathsync(exp);
                var files = fs.readdirSync(acc);
                files.forEach(function (fn) {
                    var source = fs.readFileSync(path.join(acc, fn)).toString('utf-8');
                    var dest = "";
                    try {
                        dest = fs.readFileSync(path.join(exp, fn)).toString('utf-8');
                    }
                    catch (err) { }
                    if (dest != source) {
                        fail(path.join(acc, fn) + " is not equal to " + path.join(exp, fn));
                    }
                });
            }).then(done, function (e) {
                fail(e);
                done();
            });
        });
    });
});
