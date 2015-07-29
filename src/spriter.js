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
        for (var i = 0; i < this.heights.length; i++) {
            var rowstart = i * oldwidth;
            for (var j = 0; j < oldwidth; j++) {
                newcovs.push(this.covs[rowstart + j]);
            }
            newcovs.push(false);
        }
        this.covs = newcovs;
    };
    D2Array.prototype.addRow = function (v) {
        var oldheight = this.heights.length;
        this.heights.push(v);
        for (var i = 0; i < this.widths.length; i++) {
            this.covs.push(false);
        }
    };
    D2Array.prototype.splitCol = function (idxpos, v) {
        var oldwidth = this.widths.length;
        var idx = 0;
        var x = 0;
        for (; idx < idxpos; idx++) {
            x += this.widths[idx];
        }
        this.widths.splice(idx, 0, v);
        this.widths[idx + 1] -= v;
        var newcovs = [];
        for (var i = 0; i < this.heights.length; i++) {
            var rowstart = i * oldwidth;
            for (var j = 0; j < idx; j++) {
                newcovs.push(this.covs[rowstart + j]);
            }
            newcovs.push(this.covs[rowstart + idx]);
            for (var j = idx; j < oldwidth; j++) {
                newcovs.push(this.covs[rowstart + j]);
            }
        }
        this.covs = newcovs;
    };
    D2Array.prototype.splitRow = function (idxpos, v) {
        var width = this.widths.length;
        var oldheight = this.heights.length;
        var idx = 0;
        var x = 0;
        for (; idx < idxpos; idx++) {
            x += this.heights[idx];
        }
        this.heights.splice(idx, 0, v);
        this.heights[idx + 1] -= v;
        var newcovs = [];
        for (var i = 0; i <= idx; i++) {
            var rowstart = i * width;
            for (var j = 0; j < width; j++) {
                newcovs.push(this.covs[rowstart + j]);
            }
        }
        for (var i = idx; i < oldheight; i++) {
            var rowstart = i * width;
            for (var j = 0; j < width; j++) {
                newcovs.push(this.covs[rowstart + j]);
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
        for (var i = 0; i < h; i++) {
            for (var j = 0; j < w; j++) {
                if (this.covs[start + i * covwidth + j])
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
        for (var i = 0; i < h; i++) {
            for (var j = 0; j < w; j++) {
                this.covs[start + i * covwidth + j] = true;
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
        function isImprovement(x, y) {
            if (x <= oldDim[0])
                x = oldDim[0];
            if (y <= oldDim[1])
                y = oldDim[1];
            var n = x * y - oldDim[0] * oldDim[1];
            if (addpx > n) {
                addpx = n;
                return true;
            }
            return false;
        }
        if (oldDim[0] <= oldDim[1]) {
            if (isImprovement(oldDim[0] + sprite.width, sprite.height)) {
                bestx = oldDim[0];
                besty = 0;
                bestix = this.widths.length;
                bestiy = 0;
            }
        }
        else {
            if (isImprovement(sprite.width, oldDim[1] + sprite.height)) {
                besty = oldDim[1];
                bestx = 0;
                bestix = 0;
                bestiy = this.heights.length;
            }
        }
        var posy = 0;
        stop: for (var i = 0; i < this.heights.length; i++) {
            var posx = 0;
            for (var j = 0; j < this.widths.length; j++) {
                if (this.isFree(posx, posy, i, j, sprite.width, sprite.height)) {
                    if (isImprovement(posx + sprite.width, posy + sprite.height)) {
                        bestx = posx;
                        besty = posy;
                        bestix = i;
                        bestiy = j;
                        if (addpx === 0)
                            break stop;
                    }
                }
                posx += this.widths[j];
            }
            posy += this.heights[i];
        }
        sprite.x = bestx;
        sprite.y = besty;
        this.fill(bestx, besty, bestix, bestiy, sprite.width, sprite.height);
    };
    return D2Array;
})();
