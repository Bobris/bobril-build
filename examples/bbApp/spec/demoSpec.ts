describe("Demo suite", () => {
    it("works", () => {
        console.log("Hello from console.log", { complex: true, obj: 42 });
        expect(1 + 1).toBe(2);
    });

    function exampleFailure(result: number) {
        expect(1 + 2).toBe(result);
    }

    it("even more stuff works or doesn't", () => {
        exampleFailure(4);
    });
});
