import * as fs from "fs";
import * as path from "path";
import * as image from "../src/imageOps";
import * as Promise from "bluebird";

describe("replaceColor", () => {
    it("works", (done) => {
        image.loadPNG(path.join(__dirname, "light.png")).then((t) => {
            image.replaceColor(t, "#80ff80");
            return image.savePNG(t, path.join(__dirname, "lightshine.png"));
        }).done(done);
    });
});
