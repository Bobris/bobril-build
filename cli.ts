import * as bb from './index';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as pathPlatformDependent from "path";

let bbPackageJson: any;

function loadBBPackage() {
    let pp = pathPlatformDependent.join(__dirname, 'package.json');
    bbPackageJson=JSON.parse(fs.readFileSync(pp, 'utf8'))
}

function debounce(func: Function, wait: number = 100, immediate?: boolean): Function {
    var timeout, args, context, timestamp, result;

    function later() {
        let last = Date.now() - timestamp;

        if (last < wait && last > 0) {
            timeout = setTimeout(later, wait - last);
        } else {
            timeout = null;
            if (!immediate) {
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            }
        }
    };

    return function debounced() {
        context = this;
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
            result = func.apply(context, args);
            context = args = null;
        }

        return result;
    };
};

export function run() {
    loadBBPackage();
    console.log('Bobril-build ' + bbPackageJson.version +' - ' + process.cwd());
    let startWatching = Date.now();
    chokidar.watch(['**/*.ts', '**/tsconfig.json'], { ignoreInitial: true }).once('ready', () => {
        console.log('Watching in ' + (Date.now() - startWatching).toFixed(0)+'ms');
    }).on('all', debounce((v,v2) => {
        console.log('Something changed a '+v+' '+v2);
    }));
}
