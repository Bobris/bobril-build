import * as fs from "fs";
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as spriter from "./spriter";
import * as imageOps from "./imageOps";
require('bluebird');

function normalizeFileName(fn: string): string {
    return fn.replace(/\\/g, "/").toLowerCase();
}

interface ImageInfo {
    fullName: string;
    normalizedFullName: string;
    oldModified: Date;
    modified: Date;
    width: number;
    height: number;
    img: imageOps.Image;
}

export class ImgCache {
    fn2Info: { [name: string]: ImageInfo };
    needs: { [name: string]: boolean };
    someChange: boolean;

    constructor() {
        this.fn2Info = Object.create(null);
        this.needs = Object.create(null);
        this.someChange = false;
    }

    wasChange(): boolean {
        return this.someChange;
    }

    clear(commit: boolean) {
        for (let i in this.needs) {
            let inf = this.fn2Info[i];
            if (commit) inf.oldModified = inf.modified;
            inf.modified = null;
            inf.img = null;
        }
        this.needs = Object.create(null);
        this.someChange = false;
    }

    // returns numalized name is found, undefined if file not found
    add(fullName: string): string {
        var norm = normalizeFileName(fullName);
        if (norm in this.needs) return norm;
        this.needs[norm] = true;
        let ii = this.fn2Info[norm];
        if (ii !== undefined) {
            try {
                let stats = fs.statSync(fullName);
                if (!stats.isFile()) return undefined;
                ii.modified = stats.mtime;
                if (ii.modified !== ii.oldModified) this.someChange = true;
            } catch (er) {
                return undefined;
            }
            return norm;
        }
        ii = {
            fullName,
            normalizedFullName: norm,
            oldModified: null,
            modified: null,
            width: 0,
            height: 0,
            img: null
        };
        this.fn2Info[norm] = ii;
        try {
            let stats = fs.statSync(fullName);
            if (!stats.isFile()) return undefined;
            ii.modified = stats.mtime;
            this.someChange = true;
        } catch (er) {
            return undefined;
        }
        return norm;
    }

    load(onLoaded: (ii: ImageInfo) => void): Promise<any> {
        let prom = Promise.resolve<any>(null);
        for (let i in this.needs) {
            let info = this.fn2Info[i];
            ((inf: ImageInfo) => {
                prom = prom.then(() => {
                    return imageOps.loadPNG(inf.fullName).then(img=> {
                        inf.width = img.width;
                        inf.height = img.height;
                        inf.img = img;
                        onLoaded(inf);
                        return img;
                    });
                });
            })(info);
        }
        return prom;
    }
}

interface ImageBundleInfo {
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

export class ImgBundleCache {
    imgCache: ImgCache;
    old: ImageBundleInfo[];
    cur: ImageBundleInfo[];
    keys: { [key: string]: ImageBundleInfo };

    constructor(imgCache: ImgCache) {
        this.imgCache = imgCache;
        this.old = [];
        this.cur = [];
        this.keys = Object.create(null);
    }

    clear(commit: boolean) {
        if (commit)
            this.old = this.cur;
        this.cur = [];
        this.imgCache.clear(commit);
    }

    // returns false if file not found, returns true if ok
    add(fullName: string, color: string, width: number, height: number, x: number, y: number): boolean {
        let norm = this.imgCache.add(fullName);
        if (norm === undefined) return false;
        let key = norm + "|" + (color || "") + "|" + (width || -1) + "|" + (height || -1) + "|" + (x || 0) + "|" + (y || 0);
        if (key in this.keys) return true;
        let v: ImageBundleInfo = {
            key, normalizedFullName: norm, color, width, height, x, y, bwidth: undefined, bheight: undefined, bx: undefined, by: undefined
        };
        this.cur.push(v);
        this.keys[key] = v;
        return true;
    }

    wasChange(): boolean {
        this.cur.sort((l: ImageBundleInfo, r: ImageBundleInfo) => { if (l.key < r.key) return -1; if (l.key > r.key) return 1; return 0; });
        if (this.old.length != this.cur.length) return true;
        if (this.imgCache.wasChange())
            return true;
        for (let i = 0; i < this.cur.length; i++) {
            if (this.old[i].key !== this.cur[i].key) return true;
        }
        return false;
    }

    build(): Promise<imageOps.Image> {
        let bundle: SpritePlaceInfo[] = [];
        let prom = this.imgCache.load((inf: ImageInfo) => {
            for (let i = 0; i < this.cur.length; i++) {
                let c = this.cur[i];
                if (c.normalizedFullName === inf.normalizedFullName) {
                    if (c.width != null) c.bwidth = c.width; else c.bwidth = inf.width;
                    if (c.height != null) c.bheight = c.height; else c.bheight = inf.height;
                    bundle.push({
                        inf, ibi: c, width: c.bwidth, height: c.bheight, x: 0, y: 0
                    });
                }
            }
        });
        return prom.then(() => {
            var dim = spriter.spritePlace(bundle);
            let bundleImg = imageOps.createImage(dim[0], dim[1]);
            for (let i = 0; i < bundle.length; i++) {
                let c = bundle[i];
                c.ibi.bx = c.x;
                c.ibi.by = c.y;
                let img = c.inf.img;
                if (c.ibi.color) {
                    img = imageOps.cloneImage(img);
                    imageOps.replaceColor(img, c.ibi.color);
                }
                imageOps.drawImage(img, bundleImg, c.x, c.y, c.ibi.x||0, c.ibi.y||0, c.width, c.height);
            }
            return bundleImg;
        });
    }

    query(fullName: string, color: string, width: number, height: number, x: number, y: number): { width: number, height: number, x: number, y: number } {
        let norm = this.imgCache.add(fullName);
        if (norm === undefined) throw Error("querying not added file " + fullName);
        let key = norm + "|" + (color || "") + "|" + (width || -1) + "|" + (height || -1) + "|" + (x || 0) + "|" + (y || 0);
        let v = this.keys[key];
        if (v === undefined) throw Error("querying not added combination " + key);
        return { width: v.bwidth, height: v.bheight, x: v.bx, y: v.by };
    }
}
