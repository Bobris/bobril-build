"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everywhere, just use forward slashes
function numberToChars(n) {
    let res = "";
    do {
        let rem = n % 26;
        res += String.fromCharCode(97 + rem);
        n = ((n / 26) | 0) - 1;
    } while (n >= 0);
    return res;
}
function createFileNameShortener() {
    let map = Object.create(null);
    let extToCount = Object.create(null);
    return (fn) => {
        let res = map[fn];
        if (res !== undefined)
            return res;
        let ext = path.extname(fn);
        let extc = extToCount[ext];
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
//# sourceMappingURL=shortenFileName.js.map