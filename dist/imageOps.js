"use strict";
const fs = require("fs");
const pnglib = require("png-async");
require('bluebird');
(function (EDeflateStrategy) {
    EDeflateStrategy[EDeflateStrategy["DEFAULT_STRATEGY"] = 0] = "DEFAULT_STRATEGY";
    EDeflateStrategy[EDeflateStrategy["FILTERED"] = 1] = "FILTERED";
    EDeflateStrategy[EDeflateStrategy["HUFFMAN_ONLY"] = 2] = "HUFFMAN_ONLY";
    EDeflateStrategy[EDeflateStrategy["RLE"] = 3] = "RLE";
    EDeflateStrategy[EDeflateStrategy["FIXED"] = 4] = "FIXED";
})(exports.EDeflateStrategy || (exports.EDeflateStrategy = {}));
var EDeflateStrategy = exports.EDeflateStrategy;
(function (EFilterType) {
    EFilterType[EFilterType["Auto"] = -1] = "Auto";
    EFilterType[EFilterType["None"] = 0] = "None";
    EFilterType[EFilterType["Sub"] = 1] = "Sub";
    EFilterType[EFilterType["Up"] = 2] = "Up";
    EFilterType[EFilterType["Average"] = 3] = "Average";
    EFilterType[EFilterType["Paeth"] = 4] = "Paeth";
})(exports.EFilterType || (exports.EFilterType = {}));
var EFilterType = exports.EFilterType;
function cloneImage(img) {
    let res = pnglib.createImage({ width: img.width, height: img.height, fill: false });
    img.bitblt(res, 0, 0, img.width, img.height, 0, 0);
    return res;
}
exports.cloneImage = cloneImage;
const rgbaRegex = /\s*rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d+|\d*\.\d+)\s*\)\s*/;
function replaceColor(img, color) {
    let { width, height, data: imgd } = img;
    let rgba = rgbaRegex.exec(color);
    let cred, cgreen, cblue, calpha;
    if (rgba) {
        cred = parseInt(rgba[1], 10);
        cgreen = parseInt(rgba[2], 10);
        cblue = parseInt(rgba[3], 10);
        calpha = Math.round(parseFloat(rgba[4]) * 255);
    }
    else {
        cred = parseInt(color.substr(1, 2), 16);
        cgreen = parseInt(color.substr(3, 2), 16);
        cblue = parseInt(color.substr(5, 2), 16);
        calpha = parseInt(color.substr(7, 2), 16) || 0xff;
    }
    if (calpha === 0xff) {
        for (var i = 0; i < imgd.length; i += 4) {
            // Horrible workaround for imprecisions due to browsers using premultiplied alpha internally for canvas
            let red = imgd[i];
            if (red === imgd[i + 1] && red === imgd[i + 2] && (red === 0x80 || imgd[i + 3] < 0xff && red > 0x70)) {
                imgd[i] = cred;
                imgd[i + 1] = cgreen;
                imgd[i + 2] = cblue;
            }
        }
    }
    else {
        for (var i = 0; i < imgd.length; i += 4) {
            let red = imgd[i];
            let alpha = imgd[i + 3];
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
    return new Promise((r, e) => {
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
    return new Promise((r, e) => {
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
    return new Promise((r, e) => {
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
//# sourceMappingURL=imageOps.js.map