"use strict";
const spriter = require("../dist/spriter");
describe("spriter", () => {
    it("zero", () => {
        let dim = spriter.spritePlace([]);
        expect(dim).toEqual([0, 0]);
    });
    it("one", () => {
        let sp1 = { width: 10, height: 5, x: 0, y: 0 };
        let dim = spriter.spritePlace([sp1]);
        expect(dim).toEqual([11, 6]);
        expect(sp1.x).toEqual(0);
        expect(sp1.y).toEqual(0);
    });
    it("bigAndSmall", () => {
        let sp1 = { width: 10, height: 5, x: 0, y: 0 };
        let sp2 = { width: 5, height: 2, x: 0, y: 0 };
        let dim = spriter.spritePlace([sp2, sp1]);
        expect(dim).toEqual([11, 9]);
        expect(sp1.x).toEqual(0);
        expect(sp1.y).toEqual(0);
        expect(sp2.x).toEqual(0);
        expect(sp2.y).toEqual(6);
    });
    it("two", () => {
        let sp1 = { width: 10, height: 5, x: 0, y: 0 };
        let sp2 = { width: 10, height: 5, x: 0, y: 0 };
        let dim = spriter.spritePlace([sp1, sp2]);
        expect(dim).toEqual([11, 12]);
        expect(sp1.x).toEqual(0);
        expect(sp1.y + sp2.y).toEqual(6);
        expect(sp2.x).toEqual(0);
    });
    it("16", () => {
        var a = [];
        for (let i = 0; i < 16; i++) {
            a.push({ width: 10, height: 10, x: 0, y: 0 });
        }
        let dim = spriter.spritePlace(a);
        expect(dim).toEqual([44, 44]);
    });
});
//# sourceMappingURL=spriterSpec.js.map