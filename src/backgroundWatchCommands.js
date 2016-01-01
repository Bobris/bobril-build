"use strict";
var chokidar = require('chokidar');
var debounce = require('./debounce');
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
        process.send({ command: "watchChange", param: res });
    }));
}
exports.watch = watch;
