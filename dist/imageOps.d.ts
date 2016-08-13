import * as stream from 'stream';
export interface IImageOptions {
    width?: number;
    height?: number;
    fill?: boolean;
    checkCRC?: boolean;
    deflateChunkSize?: number;
    deflateLevel?: number;
    deflateStrategy?: EDeflateStrategy;
    filterType?: EFilterType;
}
export declare enum EDeflateStrategy {
    DEFAULT_STRATEGY = 0,
    FILTERED = 1,
    HUFFMAN_ONLY = 2,
    RLE = 3,
    FIXED = 4,
}
export declare enum EFilterType {
    Auto = -1,
    None = 0,
    Sub = 1,
    Up = 2,
    Average = 3,
    Paeth = 4,
}
export interface Image extends stream.Duplex {
    width: number;
    height: number;
    gamma: number;
    data: Buffer;
    pack(): Image;
    parse(data: Buffer, callback?: (err: Error, image: Image) => void): Image;
    write(data: any, cb?: any): boolean;
    end(data?: any): void;
    bitblt(dst: Image, sx: number, sy: number, w: number, h: number, dx: number, dy: number): Image;
    on(event: string, listener: Function): this;
    once(event: string, listener: Function): this;
    removeListener(event: string, listener: Function): this;
    removeAllListeners(event: string): this;
}
export declare function cloneImage(img: Image): Image;
export declare function replaceColor(img: Image, color: string): void;
export declare function loadPNG(filename: string): Promise<Image>;
export declare function savePNG(img: Image, filename: string): Promise<any>;
export declare function savePNG2Buffer(img: any): Promise<Buffer>;
export declare function createImage(width: number, height: number): Image;
export declare function drawImage(src: Image, dst: Image, dx: number, dy: number, sx?: number, sy?: number, width?: number, height?: number): void;
