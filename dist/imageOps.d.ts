import * as pnglib from "png-async";
export declare type Image = pnglib.Image;
export declare function cloneImage(img: Image): Image;
export declare function replaceColor(img: Image, color: string): void;
export declare function loadPNG(filename: string): Promise<Image>;
export declare function savePNG(img: Image, filename: string): Promise<any>;
export declare function savePNG2Buffer(img: any): Promise<Buffer>;
export declare function createImage(width: number, height: number): Image;
export declare function drawImage(src: Image, dst: Image, dx: number, dy: number, sx?: number, sy?: number, width?: number, height?: number): void;
