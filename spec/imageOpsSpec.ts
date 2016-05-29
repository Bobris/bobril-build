import * as fs from "fs";
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as image from "../dist/imageOps";
require('bluebird');

describe("replaceColor", () => {
    it("works", (done) => {
        image.loadPNG(path.join(__dirname, "../spec/light.png")).then((t) => {
            image.replaceColor(t, "#80ff80");
            return image.savePNG(t, path.join(__dirname, "../spec/lightshine.png"));
        }).then(done);
    });
});
