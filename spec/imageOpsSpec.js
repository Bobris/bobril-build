var path = require("path");
var image = require("../src/imageOps");
describe("replaceColor", function () {
    it("works", function (done) {
        image.loadPNG(path.join(__dirname, "light.png")).then(function (t) {
            image.replaceColor(t, "#80ff80");
            return image.savePNG(t, path.join(__dirname, "lightshine.png"));
        }).done(done);
    });
});
