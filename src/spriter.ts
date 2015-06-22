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
        for (let i = 0; i < this.heights.length; i++) {
            let rowstart = i * oldwidth;
            for (let j = 0; j < oldwidth; j++) {
                newcovs.push(this.covs[rowstart + j]);
            }
            newcovs.push(false);
        }
        this.covs = newcovs;
    }
    addRow(v: number) {
        const oldheight = this.heights.length;
        this.heights.push(v);
        for (let i = 0; i < this.widths.length; i++) {
            this.covs.push(false);
        }
    }
    splitCol(pos: number, v: number) {
        const oldwidth = this.widths.length;
        let idx = 0;
        let x = 0;
        for (; idx < this.widths.length; idx++) {
            if (x === pos) break;
            x += this.widths[idx];
        }
        if (pos === this.widths.length) throw new Error("pos is not start of any column");
        this.widths.splice(idx, 0, v);
        this.widths[idx + 1] -= v;
        let newcovs = [];
        for (let i = 0; i < this.heights.length; i++) {
            let rowstart = i * oldwidth;
            for (let j = 0; j < idx; j++) {
                newcovs.push(this.covs[rowstart + j]);
            }
            newcovs.push(this.covs[rowstart + idx]);
            for (let j = idx; j < oldwidth; j++) {
                newcovs.push(this.covs[rowstart + j]);
            }
        }
        this.covs = newcovs;
    }
    splitRow(pos: number, v: number) {
        const width = this.widths.length;
        const oldheight = this.heights.length;
        let idx = 0;
        let x = 0;
        for (; idx < this.heights.length; idx++) {
            if (x === pos) break;
            x += this.heights[idx];
        }
        if (pos === this.heights.length) throw new Error("pos is not start of any row");
        this.heights.splice(idx, 0, v);
        this.heights[idx + 1] -= v;
        let newcovs = [];
        for (let i = 0; i <= idx; i++) {
            let rowstart = i * width;
            for (let j = 0; j < width; j++) {
                newcovs.push(this.covs[rowstart + j]);
            }
        }
        for (let i = idx; i < oldheight; i++) {
            let rowstart = i * width;
            for (let j = 0; j < width; j++) {
                newcovs.push(this.covs[rowstart + j]);
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
        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                if (this.covs[start + i * covwidth + j]) return false;
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
                this.splitCol(idxy + h - 1, height);
            }
        }
        if (height > 0) {
            this.addRow(height);
            h++;
        }
        const covwidth = this.widths.length;
        const start = idxy * covwidth + idxx;
        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                this.covs[start + i * covwidth + j] = true;
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
            if (isImprovement(oldDim[0] + sprite.width, sprite.height)) {
                bestx = oldDim[0]; besty = 0;
                bestix = this.widths.length; bestiy = 0;
            }
        } else {
            if (isImprovement(sprite.width, oldDim[1] + sprite.height)) {
                besty = oldDim[1]; bestx = 0;
                bestix = 0; bestiy = this.heights.length;
            }
        }
        let posy = 0;
        stop:
        for (let i = 0; i < this.heights.length; i++) {
            let posx = 0;
            for (let j = 0; j < this.widths.length; j++) {
                if (this.isFree(posx, posy, i, j, sprite.width, sprite.height)) {
                    if (isImprovement(posx + sprite.width, posy + sprite.height)) {
                        bestx = posx; besty = posy;
                        bestix = i; bestiy = j;
                        if (addpx === 0) break stop;
                    }
                }
                posx += this.widths[j];
            }
            posy += this.heights[i];
        }
        sprite.x = bestx;
        sprite.y = besty;
        this.fill(bestx, besty, bestix, bestiy, sprite.width, sprite.height);
    }
}
