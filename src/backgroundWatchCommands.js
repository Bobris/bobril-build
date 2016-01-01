"use strict";
var chokidar = require('chokidar');
var debounce = require('./debounce');
var fs = require('fs');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var deepEqual_1 = require('./deepEqual');
var lastFiles = null;
function runUpdateTsConfig(cwd, files) {
    var tscfgPath = path.join(cwd, 'tsconfig.json');
    var tscfg = null;
    if (fs.existsSync(tscfgPath)) {
        try {
            tscfg = JSON.parse(fs.readFileSync(tscfgPath, 'utf8'));
        }
        catch (e) {
            console.log("Failed to read and parse " + tscfgPath, e);
        }
    }
    if (tscfg == null) {
        tscfg = {
            compilerOptions: {
                target: "es6",
                module: "commonjs",
                moduleResolution: "node"
            },
            compileOnSave: false,
            files: []
        };
    }
    var fileList = [];
    var dirs = Object.keys(files);
    for (var i = 0; i < dirs.length; i++) {
        var d = dirs[i];
        if (/^node_modules/i.test(d))
            continue;
        var f = files[d];
        if (d === ".") {
            d = "";
        }
        else {
            d = d + '/';
        }
        for (var j = 0; j < f.length; j++)
            fileList.push(d + f[j]);
    }
    fileList.sort();
    if (deepEqual_1.deepEqual(tscfg, fileList))
        return;
    tscfg.files = fileList;
    try {
        fs.writeFileSync(tscfgPath, JSON.stringify(tscfg, null, 4));
    }
    catch (e) {
        console.log("Failed to read and parse " + tscfgPath, e);
    }
}
function watch(param) {
    var filterRe = new RegExp(param.filter);
    var w = chokidar.watch(param.paths, { cwd: param.cwd, ignored: /[\/\\]\./, ignoreInitial: false });
    w.on('all', debounce.debounce(function (v, v2) {
        var wa = w.getWatched();
        var k = Object.keys(wa);
        var res = Object.create(null);
        k.forEach(function (v) {
            if (v === "..")
                return;
            var items = wa[v];
            if (items.length === 0)
                return;
            items = items.filter(function (i) { return filterRe.test(i); });
            if (items.length === 0)
                return;
            res[v.replace(/\\/g, "/")] = items;
        });
        if (deepEqual_1.deepEqual(res, lastFiles)) {
            process.send({ command: "watchChange", param: null });
        }
        else {
            lastFiles = res;
            if (param.updateTsConfig)
                runUpdateTsConfig(param.cwd, res);
            process.send({ command: "watchChange", param: res });
        }
    }));
}
exports.watch = watch;
