"use strict";
function globalDefines(defines) {
    var res = "";
    if (defines == null)
        return res;
    var dns = Object.keys(defines);
    for (var i = 0; i < dns.length; i++) {
        res += "var " + dns[i] + " = " + JSON.stringify(defines[dns[i]]) + ";\n";
    }
    return res;
}
exports.globalDefines = globalDefines;
