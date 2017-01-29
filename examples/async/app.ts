import * as lib from "./lib";

async function mainAsync() {
    console.log("A");
    await lib.think();
    console.log("B");
}

mainAsync();
