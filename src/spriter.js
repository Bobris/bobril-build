"use strict";
function spritePlace(sprites) {
    var a = new D2Array();
    sprites.sort(function (l, r) { return r.height - l.height; });
    for (var i = 0; i < sprites.length; i++) {
        a.add(sprites[i]);
    }
    return a.getDim();
}
exports.spritePlace = spritePlace;
var D2Array = (function () {
    function D2Array() {
        this.widths = [];
        this.heights = [];
        this.covs = [];
    }
    D2Array.prototype.getDim = function () {
        return [this.widths.reduce(function (p, c) { return p + c; }, 0), this.heights.reduce(function (p, c) { return p + c; }, 0)];
    };
    D2Array.prototype.addCol = function (v) {
        var oldwidth = this.widths.length;
        this.widths.push(v);
        var newcovs = [];
        for (var iy = 0; iy < this.heights.length; iy++) {
            var rowstart = iy * oldwidth;
            for (var ix = 0; ix < oldwidth; ix++) {
                newcovs.push(this.covs[rowstart + ix]);
            }
            newcovs.push(false);
        }
        this.covs = newcovs;
    };
    D2Array.prototype.addRow = function (v) {
        var oldheight = this.heights.length;
        this.heights.push(v);
        for (var ix = 0; ix < this.widths.length; ix++) {
            this.covs.push(false);
        }
    };
    D2Array.prototype.splitCol = function (idxpos, v) {
        var oldwidth = this.widths.length;
        this.widths.splice(idxpos, 0, v);
        this.widths[idxpos + 1] -= v;
        var newcovs = [];
        for (var iy = 0; iy < this.heights.length; iy++) {
            var rowstart = iy * oldwidth;
            for (var ix = 0; ix < idxpos; ix++) {
                newcovs.push(this.covs[rowstart + ix]);
            }
            newcovs.push(this.covs[rowstart + idxpos]);
            for (var ix = idxpos; ix < oldwidth; ix++) {
                newcovs.push(this.covs[rowstart + ix]);
            }
        }
        this.covs = newcovs;
    };
    D2Array.prototype.splitRow = function (idxpos, v) {
        var width = this.widths.length;
        var oldheight = this.heights.length;
        this.heights.splice(idxpos, 0, v);
        this.heights[idxpos + 1] -= v;
        var newcovs = [];
        for (var iy = 0; iy <= idxpos; iy++) {
            var rowstart = iy * width;
            for (var ix = 0; ix < width; ix++) {
                newcovs.push(this.covs[rowstart + ix]);
            }
        }
        for (var iy = idxpos; iy < oldheight; iy++) {
            var rowstart = iy * width;
            for (var ix = 0; ix < width; ix++) {
                newcovs.push(this.covs[rowstart + ix]);
            }
        }
        this.covs = newcovs;
    };
    D2Array.prototype.isFree = function (posx, posy, idxx, idxy, width, height) {
        if (idxx >= this.widths.length)
            return true;
        if (idxy >= this.heights.length)
            return true;
        if (this.covs[idxy * this.widths.length + idxx])
            return false;
        var w = 0;
        while (width > 0 && idxx + w < this.widths.length) {
            width -= this.widths[idxx + w];
            w++;
        }
        var h = 0;
        while (height > 0 && idxy + h < this.heights.length) {
            height -= this.heights[idxy + h];
            h++;
        }
        var covwidth = this.widths.length;
        var start = idxy * covwidth + idxx;
        for (var iy = 0; iy < h; iy++) {
            for (var ix = 0; ix < w; ix++) {
                if (this.covs[start + iy * covwidth + ix])
                    return false;
            }
        }
        return true;
    };
    D2Array.prototype.fill = function (posx, posy, idxx, idxy, width, height) {
        var w = 0;
        var h = 0;
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
        var covwidth = this.widths.length;
        var start = idxy * covwidth + idxx;
        for (var iy = 0; iy < h; iy++) {
            for (var ix = 0; ix < w; ix++) {
                this.covs[start + iy * covwidth + ix] = true;
            }
        }
    };
    D2Array.prototype.add = function (sprite) {
        var oldDim = this.getDim();
        var addpx = Infinity;
        var bestx = 0;
        var besty = 0;
        var bestix = 0;
        var bestiy = 0;
        var aHeight = sprite.height + 1;
        var aWidth = sprite.width + 1;
        function isImprovement(x, y) {
            if (x <= oldDim[0])
                x = oldDim[0];
            if (y <= oldDim[1])
                y = oldDim[1];
            var n = x * y - oldDim[0] * oldDim[1];
            if (addpx !== Infinity) {
                if (x > y * 2 && x - oldDim[0] > 0)
                    return false;
                if (y > x * 2 && y - oldDim[1] > 0)
                    return false;
            }
            if (addpx > n) {
                addpx = n;
                return true;
            }
            return false;
        }
        if (oldDim[0] <= oldDim[1]) {
            if (isImprovement(oldDim[0] + aWidth, aHeight)) {
                bestx = oldDim[0];
                besty = 0;
                bestix = this.widths.length;
                bestiy = 0;
            }
        }
        else {
            if (isImprovement(aWidth, oldDim[1] + aHeight)) {
                besty = oldDim[1];
                bestx = 0;
                bestix = 0;
                bestiy = this.heights.length;
            }
        }
        var posy = 0;
        stop: for (var iy = 0; iy < this.heights.length; iy++) {
            var posx = 0;
            for (var ix = 0; ix < this.widths.length; ix++) {
                if (this.isFree(posx, posy, ix, iy, aWidth, aHeight)) {
                    if (isImprovement(posx + aWidth, posy + aHeight)) {
                        bestx = posx;
                        besty = posy;
                        bestix = ix;
                        bestiy = iy;
                        if (addpx === 0)
                            break stop;
                    }
                }
                posx += this.widths[ix];
            }
            posy += this.heights[iy];
        }
        sprite.x = bestx;
        sprite.y = besty;
        this.fill(bestx, besty, bestix, bestiy, aWidth, aHeight);
    };
    return D2Array;
}());
