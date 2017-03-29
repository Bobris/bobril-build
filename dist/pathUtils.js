"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everywhere, just use forward slashes
const fs = require("fs");
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
function join(...paths) {
    if (paths.length === 0)
        return '';
    let pos = paths.length - 1;
    let p = paths[pos];
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
function recursiveRemoveDir(path) {
    if (!fs.existsSync(path))
        return;
    fs.readdirSync(path).forEach(function (file, index) {
        var curPath = path + "/" + file;
        if (fs.lstatSync(curPath).isDirectory()) {
            recursiveRemoveDirSync(curPath);
        }
        else {
            fs.unlinkSync(curPath);
        }
    });
    fs.rmdirSync(path);
}
function recursiveRemoveDirSync(path) {
    try {
        recursiveRemoveDir(path);
    }
    catch (ex) {
        return false;
    }
    return true;
}
exports.recursiveRemoveDirSync = recursiveRemoveDirSync;
function normalizePath(path) {
    return path.replace(/\\/g, '/');
}
exports.normalizePath = normalizePath;
//# sourceMappingURL=pathUtils.js.map