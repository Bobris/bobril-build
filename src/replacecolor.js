var pnglib = require("png-async");
function cloneImage(img) {
    var res = pnglib.createImage({ width: img.width, height: img.height, fill: false });
    img.bitblt(res, 0, 0, img.width, img.height, 0, 0);
    return res;
}
exports.cloneImage = cloneImage;
function replaceColor(imgdata, color) {
}
exports.replaceColor = replaceColor;
