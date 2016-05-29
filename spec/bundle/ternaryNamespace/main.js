"use strict";
const liba = require('./liba');
const libb = require('./libb');
let lib = Math.random() > 0.5 ? liba : libb;
console.log(lib.fn(1, 2));
//# sourceMappingURL=main.js.map