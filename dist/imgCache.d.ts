import * as spriter from "./spriter";
import * as imageOps from "./imageOps";
export interface ImageInfo {
    fullName: string;
    normalizedFullName: string;
    oldModified: Date;
    modified: Date;
    width: number;
    height: number;
    img: imageOps.Image;
}
export declare class ImgCache {
    fn2Info: {
        [name: string]: ImageInfo;
    };
    needs: {
        [name: string]: boolean;
    };
    someChange: boolean;
    constructor();
    wasChange(): boolean;
    clear(commit: boolean): void;
    add(fullName: string): string;
    load(onLoaded: (ii: ImageInfo) => void): Promise<any>;
}
export interface ImageBundleInfo {
    key: string;
    normalizedFullName: string;
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
    bx: number;
    by: number;
    bwidth: number;
    bheight: number;
}
export interface SpritePlaceInfo extends spriter.SpritePlace {
    ibi: ImageBundleInfo;
    inf: ImageInfo;
}
export declare class ImgBundleCache {
    imgCache: ImgCache;
    old: ImageBundleInfo[];
    cur: ImageBundleInfo[];
    keys: {
        [key: string]: ImageBundleInfo;
    };
    constructor(imgCache: ImgCache);
    clear(commit: boolean): void;
    add(fullName: string, color: string, width: number, height: number, x: number, y: number): boolean;
    wasChange(): boolean;
    build(): Promise<imageOps.Image>;
    query(fullName: string, color: string, width: number, height: number, x: number, y: number): {
        width: number;
        height: number;
        x: number;
        y: number;
    };
}
