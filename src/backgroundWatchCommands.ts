import * as chokidar from 'chokidar';
import * as debounce from './debounce';
import * as fs from 'fs';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import { deepEqual } from './deepEqual';

let lastFiles: { [dir: string]: string[] } = null;

function runUpdateTsConfig(cwd: string, files: { [dir: string]: string[] }) {
    let tscfgPath = path.join(cwd, 'tsconfig.json');
    let tscfg = null;
    if (fs.existsSync(tscfgPath)) {
        try {
            tscfg = JSON.parse(fs.readFileSync(tscfgPath, 'utf8'));
        } catch (e) {
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
    let fileList = [];
    let dirs = Object.keys(files);
    for (let i = 0; i < dirs.length; i++) {
        let d = dirs[i];
        if (/^node_modules/i.test(d))
            continue;
        let f = files[d];
        if (d === ".") {
            d = "";
        } else {
            d = d + '/';
        }
        for (let j = 0; j < f.length; j++)
            fileList.push(d + f[j]);
    }
    fileList.sort();
    if (deepEqual(tscfg, fileList))
        return;
    tscfg.files = fileList;
    try {
        fs.writeFileSync(tscfgPath, JSON.stringify(tscfg, null, 4));
    } catch (e) {
        console.log("Failed to read and parse " + tscfgPath, e);
    }
}

export function watch(param: { cwd: string, paths: string[], filter: string, updateTsConfig: boolean }) {
    let filterRe = new RegExp(param.filter);
    let w = chokidar.watch(param.paths, { cwd: param.cwd, ignored: /[\/\\]\./, ignoreInitial: false });
    w.on('all', debounce.debounce((v, v2) => {
        let wa = (<any>w).getWatched();
        let k = Object.keys(wa);
        let res = Object.create(null);
        k.forEach((v) => {
            if (v === "..") return;
            let items = wa[v];
            if (items.length === 0) return;
            items = items.filter((i) => filterRe.test(i));
            if (items.length === 0) return;
            res[v.replace(/\\/g, "/")] = items;
        });
        if (deepEqual(res, lastFiles)) {
            process.send({ command: "watchChange", param: null })
        } else {
            lastFiles = res;
            if (param.updateTsConfig)
                runUpdateTsConfig(param.cwd, res);
            process.send({ command: "watchChange", param: res });
        }
    }));
}
