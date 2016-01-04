"use strict";
var chokidar = require('chokidar');
var debounce = require('./debounce');
var deepEqual_1 = require('./deepEqual');
function watch(param) {
    var filterRe = new RegExp(param.filter);
    var lastFiles = null;
    var w = chokidar.watch(param.paths, { cwd: param.cwd, ignored: /[\/\\]\./, ignoreInitial: true });
    var action = debounce.debounce(function (v1, v2) {
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
            items.sort();
            res[v.replace(/\\/g, "/")] = items;
        });
        if (deepEqual_1.deepEqual(res, lastFiles)) {
            process.send({ command: "watchChange", param: null });
        }
        else {
            lastFiles = res;
            process.send({ command: "watchChange", param: res });
        }
    });
    w.on('ready', action);
    w.on('all', action);
}
exports.watch = watch;
