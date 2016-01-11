describe("Demo suite", () => {
    it("works", () => {
        expect(1 + 1).toBe(2);
    });

    function exampleFailure(result: number) {
        expect(1 + 2).toBe(result);
    }

    it("even more stuff works", () => {
        exampleFailure(4);
    });
});
