import * as fs from "fs";
import * as path from "path";
import * as pnglib from "png-async";
import { replaceColor } from "../src/imagehelpers";

describe("replaceColor", () => {
    it("works", (done) => {
        fs.createReadStream(path.join(__dirname, "light.png"))
            .pipe(pnglib.createImage({}))
            .on('parsed', function() {
                replaceColor(this, "#80ff80");
                var buffers = [];
                this.on('data', function(chunk){
                  buffers.push(chunk);
                });
                this.on('end', function(){
                  fs.writeFileSync(path.join(__dirname, "lightshine.png"),Buffer.concat(buffers));
                  done();
                });
                this.pack();
            });
    });
});
