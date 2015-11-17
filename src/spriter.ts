export interface SpritePlace {
    width: number;
    height: number;
    x: number;
    y: number;
}

export function spritePlace<T extends SpritePlace>(sprites: T[]): [number, number] {
    var a = new D2Array();
    sprites.sort((l, r) => r.height - l.height);
    for (let i = 0; i < sprites.length; i++) {
        a.add(sprites[i]);
    }
    return a.getDim();
}

class D2Array {
    private widths: number[];
    private heights: number[];
    private covs: boolean[];
    constructor() {
        this.widths = [];
        this.heights = [];
        this.covs = [];
    }
    getDim(): [number, number] {
        return [this.widths.reduce((p, c) => p + c, 0), this.heights.reduce((p, c) => p + c, 0)];
    }
    addCol(v: number) {
        const oldwidth = this.widths.length;
        this.widths.push(v);
        let newcovs = [];
        for (let iy = 0; iy < this.heights.length; iy++) {
            let rowstart = iy * oldwidth;
            for (let ix = 0; ix < oldwidth; ix++) {
                newcovs.push(this.covs[rowstart + ix]);
            }
            newcovs.push(false);
        }
        this.covs = newcovs;
    }
    addRow(v: number) {
        const oldheight = this.heights.length;
        this.heights.push(v);
        for (let ix = 0; ix < this.widths.length; ix++) {
            this.covs.push(false);
        }
    }
    splitCol(idxpos: number, v: number) {
        const oldwidth = this.widths.length;
        this.widths.splice(idxpos, 0, v);
        this.widths[idxpos + 1] -= v;
        let newcovs = [];
        for (let iy = 0; iy < this.heights.length; iy++) {
            let rowstart = iy * oldwidth;
            for (let ix = 0; ix < idxpos; ix++) {
                newcovs.push(this.covs[rowstart + ix]);
            }
            newcovs.push(this.covs[rowstart + idxpos]);
            for (let ix = idxpos; ix < oldwidth; ix++) {
                newcovs.push(this.covs[rowstart + ix]);
            }
        }
        this.covs = newcovs;
    }
    splitRow(idxpos: number, v: number) {
        const width = this.widths.length;
        const oldheight = this.heights.length;
        this.heights.splice(idxpos, 0, v);
        this.heights[idxpos + 1] -= v;
        let newcovs = [];
        for (let iy = 0; iy <= idxpos; iy++) {
            let rowstart = iy * width;
            for (let ix = 0; ix < width; ix++) {
                newcovs.push(this.covs[rowstart + ix]);
            }
        }
        for (let iy = idxpos; iy < oldheight; iy++) {
            let rowstart = iy * width;
            for (let ix = 0; ix < width; ix++) {
                newcovs.push(this.covs[rowstart + ix]);
            }
        }
        this.covs = newcovs;
    }
    isFree(posx: number, posy: number, idxx: number, idxy: number, width: number, height: number): boolean {
        if (idxx >= this.widths.length) return true;
        if (idxy >= this.heights.length) return true;
        if (this.covs[idxy * this.widths.length + idxx]) return false;
        let w = 0;
        while (width > 0 && idxx + w < this.widths.length) {
            width -= this.widths[idxx + w];
            w++;
        }
        let h = 0;
        while (height > 0 && idxy + h < this.heights.length) {
            height -= this.heights[idxy + h];
            h++;
        }
        const covwidth = this.widths.length;
        const start = idxy * covwidth + idxx;
        for (let iy = 0; iy < h; iy++) {
            for (let ix = 0; ix < w; ix++) {
                if (this.covs[start + iy * covwidth + ix]) return false;
            }
        }
        return true;
    }
    fill(posx: number, posy: number, idxx: number, idxy: number, width: number, height: number) {
        let w = 0;
        let h = 0;
        w = 0;
        while (width > 0 && idxx + w < this.widths.length) {
            width -= this.widths[idxx + w];
            w++;
            if (width < 0) {
                width += this.widths[idxx + w - 1];
                this.splitCol(idxx + w - 1, width);
                width = 0;
                break;
            }
        }
        if (width > 0) {
            this.addCol(width);
            w++;
        }
        h = 0;
        while (height > 0 && idxy + h < this.heights.length) {
            height -= this.heights[idxy + h];
            h++;
            if (height < 0) {
                height += this.heights[idxy + h - 1];
                this.splitRow(idxy + h - 1, height);
                height = 0;
                break;
            }
        }
        if (height > 0) {
            this.addRow(height);
            h++;
        }
        const covwidth = this.widths.length;
        const start = idxy * covwidth + idxx;
        for (let iy = 0; iy < h; iy++) {
            for (let ix = 0; ix < w; ix++) {
                this.covs[start + iy * covwidth + ix] = true;
            }
        }
    }
    add(sprite: SpritePlace) {
        const oldDim = this.getDim();
        let addpx = Infinity;
        let bestx = 0;
        let besty = 0;
        let bestix = 0;
        let bestiy = 0;
        let aHeight = sprite.height + 1;
        let aWidth = sprite.width + 1;
        function isImprovement(x: number, y: number): boolean {
            if (x <= oldDim[0]) x = oldDim[0];
            if (y <= oldDim[1]) y = oldDim[1];
            let n = x * y - oldDim[0] * oldDim[1];
            if (addpx > n) {
                addpx = n;
                return true;
            }
            return false;
        }
        if (oldDim[0] <= oldDim[1]) {
            if (isImprovement(oldDim[0] + aWidth, aHeight)) {
                bestx = oldDim[0]; besty = 0;
                bestix = this.widths.length; bestiy = 0;
            }
        } else {
            if (isImprovement(aWidth, oldDim[1] + aHeight)) {
                besty = oldDim[1]; bestx = 0;
                bestix = 0; bestiy = this.heights.length;
            }
        }
        let posy = 0;
        stop:
        for (let iy = 0; iy < this.heights.length; iy++) {
            let posx = 0;
            for (let ix = 0; ix < this.widths.length; ix++) {
                if (this.isFree(posx, posy, ix, iy, aWidth, aHeight)) {
                    if (isImprovement(posx + aWidth, posy + aHeight)) {
                        bestx = posx; besty = posy;
                        bestix = ix; bestiy = iy;
                        if (addpx === 0) break stop;
                    }
                }
                posx += this.widths[ix];
            }
            posy += this.heights[iy];
        }
        sprite.x = bestx;
        sprite.y = besty;
        this.fill(bestx, besty, bestix, bestiy, aWidth, aHeight);
    }
}
