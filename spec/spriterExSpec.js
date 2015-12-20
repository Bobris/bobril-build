"use strict";
var spriter = require("../src/spriter");
describe("spriter", function () {
    it("complex", function () {
        var a = [];
        function add(width, height, count) {
            for (var i = 0; i < count; i++)
                a.push({ width: width, height: height, x: 0, y: 0 });
        }
        add(60, 60, 9);
        add(63, 50, 1);
        add(40, 40, 10);
        var dim = spriter.spritePlace(a);
        //console.log(a);
        expect(dim).toEqual([306, 183]);
    });
});
