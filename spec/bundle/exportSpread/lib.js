"use strict";
function reg() {
    return { f1: () => "a", f2: () => "b", f3: () => "c" };
}
exports.reg = reg;
{ f1: exports.fn1, f2: exports.fn2, f3: exports.fn3 } = reg();
{ f1: exports.fn4, f2: exports.fn5, f3: exports.fn6 } = reg();
//# sourceMappingURL=lib.js.map