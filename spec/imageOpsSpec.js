"use strict";
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var image = require("../src/imageOps");
require('bluebird');
describe("replaceColor", function () {
    it("works", function (done) {
        image.loadPNG(path.join(__dirname, "light.png")).then(function (t) {
            image.replaceColor(t, "#80ff80");
            return image.savePNG(t, path.join(__dirname, "lightshine.png"));
        }).then(done);
    });
});
