"use strict";
function functionUsingEval() {
    eval('return 1');
}
function longname(parameter) {
    return parameter + functionUsingEval();
}
exports.longname = longname;
//# sourceMappingURL=lib.js.map