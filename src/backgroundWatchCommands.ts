import * as chokidar from 'chokidar';
import * as debounce from './debounce';
import { deepEqual } from './deepEqual';

export function watch(param: { cwd: string, paths: string[], filter: string }) {
    let filterRe = new RegExp(param.filter);
    let lastFiles: { [dir: string]: string[] } = null;
    let w = chokidar.watch(param.paths, { cwd: param.cwd, ignored: /[\/\\]\./, ignoreInitial: true });
    let action = debounce.debounce((v1, v2) => {
        let wa = (<any>w).getWatched();
        let k = Object.keys(wa);
        let res = Object.create(null);
        k.forEach((v) => {
            if (v === "..") return;
            let items = wa[v];
            if (items.length === 0) return;
            items = items.filter((i) => filterRe.test(i));
            if (items.length === 0) return;
            items.sort();
            res[v.replace(/\\/g, "/")] = items;
        });
        if (deepEqual(res, lastFiles)) {
            process.send({ command: "watchChange", param: null })
        } else {
            lastFiles = res;
            process.send({ command: "watchChange", param: res });
        }
    });
    w.on('ready', action);
    w.on('all', action);
}
