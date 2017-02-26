"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chokidar = require("chokidar");
const debounce = require("./debounce");
const deepEqual_1 = require("./deepEqual");
function watch(param) {
    let filterRe = new RegExp(param.filter);
    let lastFiles = null;
    let w = chokidar.watch(param.paths, { cwd: param.cwd, ignored: /[\/\\]\./, ignoreInitial: true });
    let action = debounce.debounce((v1, v2) => {
        let wa = w.getWatched();
        let k = Object.keys(wa);
        let res = Object.create(null);
        k.forEach((v) => {
            if (v === "..")
                return;
            let items = wa[v];
            if (items.length === 0)
                return;
            items = items.filter((i) => filterRe.test(i));
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
//# sourceMappingURL=backgroundWatchCommands.js.map