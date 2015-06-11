var fs = require("fs");
var path = require("path");
var pnglib = require("png-async");
var imagehelpers_1 = require("../src/imagehelpers");
describe("replaceColor", function () {
    it("works", function (done) {
        fs.createReadStream(path.join(__dirname, "light.png"))
            .pipe(pnglib.createImage({}))
            .on('parsed', function () {
            imagehelpers_1.replaceColor(this, "#80ff80");
            var buffers = [];
            this.on('data', function (chunk) {
                buffers.push(chunk);
            });
            this.on('end', function () {
                fs.writeFileSync(path.join(__dirname, "lightshine.png"), Buffer.concat(buffers));
                done();
            });
            this.pack();
        });
    });
});
