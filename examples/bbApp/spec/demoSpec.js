describe("Demo suite", function () {
    it("works", function () {
        console.log("Hello from console.log", { complex: true, obj: 42 });
        expect(1 + 1).toBe(2);
    });
    function exampleFailure(result) {
        expect(1 + 2).toBe(result);
    }
    it("even more stuff works or doesn't", function () {
        exampleFailure(4);
    });
    describe("Nested suite", function () {
        it("nests", function () {
            console.time("Yes");
            console.dir(it);
            console.timeEnd("Yes");
        });
    });
});
