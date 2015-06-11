var pnglib = require("png-async");
function cloneImage(img) {
    var res = pnglib.createImage({ width: img.width, height: img.height, fill: false });
    img.bitblt(res, 0, 0, img.width, img.height, 0, 0);
    return res;
}
exports.cloneImage = cloneImage;
function replaceColor(img, color) {
    var width = img.width, height = img.height, data = img.data;
    var cred = parseInt(color.substr(1, 2), 16);
    var cgreen = parseInt(color.substr(3, 2), 16);
    var cblue = parseInt(color.substr(5, 2), 16);
    var len = width * height * 4;
    for (var i = 0; i < len; i += 4) {
        if (data[i] === 0x80 && data[i + 1] === 0x80 && data[i + 2] === 0x80) {
            data[i] = cred;
            data[i + 1] = cgreen;
            data[i + 2] = cblue;
        }
    }
}
exports.replaceColor = replaceColor;
