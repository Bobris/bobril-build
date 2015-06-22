import * as fs from "fs";
import * as pnglib from "png-async";
import * as Promise from "bluebird";

export type Image = pnglib.Image;

export function cloneImage(img: Image): Image {
    let res = pnglib.createImage({ width: img.width, height: img.height, fill: false });
    img.bitblt(res, 0, 0, img.width, img.height, 0, 0);
    return res;
}

export function replaceColor(img: Image, color: string) {
    let { width, height, data } = img;
    var cred = parseInt(color.substr(1, 2), 16);
    var cgreen = parseInt(color.substr(3, 2), 16);
    var cblue = parseInt(color.substr(5, 2), 16);
    let len = width * height * 4;
    for (var i = 0; i < len; i += 4) {
        if (data[i] === 0x80 && data[i + 1] === 0x80 && data[i + 2] === 0x80) {
            data[i] = cred; data[i + 1] = cgreen; data[i + 2] = cblue;
        }
    }
}

export function loadPNG(filename: string): Promise<Image> {
    return new Promise<Image>((r, e) => {
        fs.createReadStream(filename)
            .pipe(pnglib.createImage({}))
            .on('parsed', function() {
                r(this);
            });
    });
}

export function savePNG(img: Image, filename: string): Promise<any> {
    return new Promise<any>((r, e) => {
        var buffers = [];
        img.on('data', function(chunk) {
            buffers.push(chunk);
        });
        img.on('end', function() {
            fs.writeFileSync(filename, Buffer.concat(buffers));
            r(null);
        });
        img.pack();
    });
}

export function createImage(width: number, height: number): Image {
    return pnglib.createImage({ width, height, fill: true });
}

export function drawImage(src: Image, dst: Image, dx: number, dy: number, sx?: number, sy?: number, width?: number, height?: number) {
    src.bitblt(dst, sx || 0, sy || 0, width || src.width, height || src.height, dx, dy);
}
