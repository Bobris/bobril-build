var fs = require("fs");
var pnglib = require("png-async");
require('bluebird');
function cloneImage(img) {
    var res = pnglib.createImage({ width: img.width, height: img.height, fill: false });
    img.bitblt(res, 0, 0, img.width, img.height, 0, 0);
    return res;
}
exports.cloneImage = cloneImage;
function replaceColor(img, color) {
    var width = img.width, height = img.height, imgd = img.data;
    var cred = parseInt(color.substr(1, 2), 16);
    var cgreen = parseInt(color.substr(3, 2), 16);
    var cblue = parseInt(color.substr(5, 2), 16);
    var calpha = parseInt(color.substr(7, 2), 16) || 0xff;
    if (calpha === 0xff) {
        for (var i = 0; i < imgd.length; i += 4) {
            // Horrible workaround for imprecisions due to browsers using premultiplied alpha internally for canvas
            var red = imgd[i];
            if (red === imgd[i + 1] && red === imgd[i + 2] && (red === 0x80 || imgd[i + 3] < 0xff && red > 0x70)) {
                imgd[i] = cred;
                imgd[i + 1] = cgreen;
                imgd[i + 2] = cblue;
            }
        }
    }
    else {
        for (var i = 0; i < imgd.length; i += 4) {
            var red = imgd[i];
            var alpha = imgd[i + 3];
            if (red === imgd[i + 1] && red === imgd[i + 2] && (red === 0x80 || alpha < 0xff && red > 0x70)) {
                if (alpha === 0xff) {
                    imgd[i] = cred;
                    imgd[i + 1] = cgreen;
                    imgd[i + 2] = cblue;
                    imgd[i + 3] = calpha;
                }
                else {
                    alpha = alpha * (1.0 / 255);
                    imgd[i] = Math.round(cred * alpha);
                    imgd[i + 1] = Math.round(cgreen * alpha);
                    imgd[i + 2] = Math.round(cblue * alpha);
                    imgd[i + 3] = Math.round(calpha * alpha);
                }
            }
        }
    }
}
exports.replaceColor = replaceColor;
function loadPNG(filename) {
    return new Promise(function (r, e) {
        try {
            fs.createReadStream(filename).on('error', function (err) {
                e(err);
            }).pipe(pnglib.createImage({}))
                .on('parsed', function () {
                r(this);
            }).on('error', function (err) {
                e(err);
            });
        }
        catch (err) {
            e(err);
        }
    });
}
exports.loadPNG = loadPNG;
function savePNG(img, filename) {
    return new Promise(function (r, e) {
        var buffers = [];
        img.on('data', function (chunk) {
            buffers.push(chunk);
        });
        img.on('end', function () {
            fs.writeFileSync(filename, Buffer.concat(buffers));
            r(null);
        });
        img.pack();
    });
}
exports.savePNG = savePNG;
function savePNG2Buffer(img) {
    return new Promise(function (r, e) {
        var buffers = [];
        img.on('data', function (chunk) {
            buffers.push(chunk);
        });
        img.on('end', function () {
            r(Buffer.concat(buffers));
        });
        img.pack();
    });
}
exports.savePNG2Buffer = savePNG2Buffer;
function createImage(width, height) {
    return pnglib.createImage({ width: width, height: height, fill: true });
}
exports.createImage = createImage;
function drawImage(src, dst, dx, dy, sx, sy, width, height) {
    src.bitblt(dst, sx || 0, sy || 0, width || src.width, height || src.height, dx, dy);
}
exports.drawImage = drawImage;
