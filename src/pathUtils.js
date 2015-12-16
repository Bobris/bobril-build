var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require("fs");
function dirOfNodeModule(name) {
    return path.dirname(require.resolve(name).replace(/\\/g, "/"));
}
exports.dirOfNodeModule = dirOfNodeModule;
function currentDirectory() {
    return process.cwd().replace(/\\/g, "/");
}
exports.currentDirectory = currentDirectory;
function isAbsolutePath(name) {
    return /^([a-zA-Z]\:)?\//.test(name);
}
exports.isAbsolutePath = isAbsolutePath;
function join() {
    var paths = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        paths[_i - 0] = arguments[_i];
    }
    if (paths.length === 0)
        return '';
    var pos = paths.length - 1;
    var p = paths[pos];
    while (pos-- > 0) {
        if (isAbsolutePath(p))
            return p;
        p = path.join(paths[pos], p);
    }
    return p;
}
exports.join = join;
function mkpathsync(dirpath) {
    try {
        if (!fs.statSync(dirpath).isDirectory()) {
            throw new Error(dirpath + ' exists and is not a directory');
        }
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            mkpathsync(path.dirname(dirpath));
            fs.mkdirSync(dirpath);
        }
        else {
            throw err;
        }
    }
}
exports.mkpathsync = mkpathsync;
;
function fileModifiedTime(path) {
    try {
        return fs.statSync(path).mtime.getTime();
    }
    catch (er) {
        return null;
    }
}
exports.fileModifiedTime = fileModifiedTime;
