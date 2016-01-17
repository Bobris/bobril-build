"use strict";
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
function numberToChars(n) {
    var res = "";
    do {
        var rem = n % 26;
        res += String.fromCharCode(97 + rem);
        n = ((n / 26) | 0) - 1;
    } while (n >= 0);
    return res;
}
function createFileNameShortener() {
    var map = Object.create(null);
    var extToCount = Object.create(null);
    return function (fn) {
        var res = map[fn];
        if (res !== undefined)
            return res;
        var ext = path.extname(fn);
        var extc = extToCount[ext];
        if (extc === undefined) {
            extc = 0;
        }
        extToCount[ext] = extc + 1;
        res = numberToChars(extc) + ext;
        map[fn] = res;
        return res;
    };
}
exports.createFileNameShortener = createFileNameShortener;
