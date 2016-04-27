"use strict";
const b = require('./bobril');
const lib = require('./lib');
function doit() {
    let link = b.link("hello");
    console.log(link);
}
doit();
console.log(lib.page);
//# sourceMappingURL=main.js.map