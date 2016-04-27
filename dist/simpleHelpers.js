"use strict";
function globalDefines(defines) {
    let res = "";
    if (defines == null)
        return res;
    let dns = Object.keys(defines);
    for (let i = 0; i < dns.length; i++) {
        res += "var " + dns[i] + " = " + JSON.stringify(defines[dns[i]]) + ";\n";
    }
    return res;
}
exports.globalDefines = globalDefines;
function removeLinkToSourceMap(content) {
    let pos = content.length - 3;
    while (pos >= 0) {
        if (content[pos] === 10)
            break;
        pos--;
    }
    if (pos < content.length - 5) {
        if (content.slice(pos + 1, pos + 4).toString() === "//#")
            return content.slice(0, pos);
    }
    return content;
}
exports.removeLinkToSourceMap = removeLinkToSourceMap;
function getUserHome() {
    return process.env.HOME || process.env.USERPROFILE;
}
exports.getUserHome = getUserHome;
//# sourceMappingURL=simpleHelpers.js.map