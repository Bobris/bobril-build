import * as fs from "fs";
import * as pnglib from "png-async";
require('bluebird');

export type Image = pnglib.Image;

export function cloneImage(img: Image): Image {
    let res = pnglib.createImage({ width: img.width, height: img.height, fill: false });
    img.bitblt(res, 0, 0, img.width, img.height, 0, 0);
    return res;
}

const rgbaRegex = /\s*rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d+|\d*\.\d+)\s*\)\s*/;

export function replaceColor(img: Image, color: string) {
    let { width, height, data: imgd } = img;
    let rgba = rgbaRegex.exec(color);
    let cred: number, cgreen: number, cblue: number, calpha: number;
    if (rgba) {
        cred = parseInt(rgba[1], 10);
        cgreen = parseInt(rgba[2], 10);
        cblue = parseInt(rgba[3], 10);
        calpha = Math.round(parseFloat(rgba[4]) * 255);
    } else {
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
                imgd[i] = cred; imgd[i + 1] = cgreen; imgd[i + 2] = cblue;
            }
        }
    } else {
        for (var i = 0; i < imgd.length; i += 4) {
            let red = imgd[i];
            let alpha = imgd[i + 3];
            if (red === imgd[i + 1] && red === imgd[i + 2] && (red === 0x80 || alpha < 0xff && red > 0x70)) {
                if (alpha === 0xff) {
                    imgd[i] = cred; imgd[i + 1] = cgreen; imgd[i + 2] = cblue; imgd[i + 3] = calpha;
                } else {
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

export function loadPNG(filename: string): Promise<Image> {
    return new Promise<Image>((r, e) => {
        try {
        (<fs.ReadStream>fs.createReadStream(filename).on('error', function(err) {
            e(err);
        })).pipe(pnglib.createImage({}))
            .on('parsed', function() {
                r(this);
            }).on('error', function(err) {
                e(err);
            });
        } catch (err) {
            e(err);
        }
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

export function savePNG2Buffer(img): Promise<Buffer> {
    return new Promise<Buffer>((r: (r: Buffer) => void, e) => {
        var buffers = [];
        img.on('data', function(chunk) {
            buffers.push(chunk);
        });
        img.on('end', function() {
            r(Buffer.concat(buffers));
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
