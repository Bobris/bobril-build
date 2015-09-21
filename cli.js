var chokidar = require('chokidar');
var fs = require('fs');
var pathPlatformDependent = require("path");
var bbPackageJson;
function loadBBPackage() {
    var pp = pathPlatformDependent.join(__dirname, 'package.json');
    bbPackageJson = JSON.parse(fs.readFileSync(pp, 'utf8'));
}
function debounce(func, wait, immediate) {
    if (wait === void 0) { wait = 100; }
    var timeout, args, context, timestamp, result;
    function later() {
        var last = Date.now() - timestamp;
        if (last < wait && last > 0) {
            timeout = setTimeout(later, wait - last);
        }
        else {
            timeout = null;
            if (!immediate) {
                result = func.apply(context, args);
                if (!timeout)
                    context = args = null;
            }
        }
    }
    ;
    return function debounced() {
        context = this;
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && !timeout;
        if (!timeout)
            timeout = setTimeout(later, wait);
        if (callNow) {
            result = func.apply(context, args);
            context = args = null;
        }
        return result;
    };
}
;
function run() {
    loadBBPackage();
    console.log('Bobril-build ' + bbPackageJson.version + ' - ' + process.cwd());
    var startWatching = Date.now();
    chokidar.watch(['**/*.ts', '**/tsconfig.json'], { ignoreInitial: true }).once('ready', function () {
        console.log('Watching in ' + (Date.now() - startWatching).toFixed(0) + 'ms');
    }).on('all', debounce(function (v, v2) {
        console.log('Something changed a ' + v + ' ' + v2);
    }));
}
exports.run = run;
