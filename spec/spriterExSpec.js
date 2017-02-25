"use strict";
const spriter = require("../dist/spriter");
describe("spriter", () => {
    it("complex", () => {
        var a = [];
        function add(width, height, count) {
            for (let i = 0; i < count; i++)
                a.push({ width, height, x: 0, y: 0 });
        }
        add(60, 60, 9);
        add(63, 50, 1);
        add(40, 40, 10);
        let dim = spriter.spritePlace(a);
        //console.log(a);
        expect(dim).toEqual([306, 183]);
    });
});
//# sourceMappingURL=spriterExSpec.js.map