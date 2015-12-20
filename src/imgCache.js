"use strict";
var fs = require("fs");
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var spriter = require("./spriter");
var imageOps = require("./imageOps");
require('bluebird');
function normalizeFileName(fn) {
    return fn.replace(/\\/g, "/").toLowerCase();
}
var ImgCache = (function () {
    function ImgCache() {
        this.fn2Info = Object.create(null);
        this.needs = Object.create(null);
        this.someChange = false;
    }
    ImgCache.prototype.wasChange = function () {
        return this.someChange;
    };
    ImgCache.prototype.clear = function (commit) {
        for (var i in this.needs) {
            var inf = this.fn2Info[i];
            if (commit)
                inf.oldModified = inf.modified;
            inf.modified = null;
            inf.img = null;
        }
        this.needs = Object.create(null);
        this.someChange = false;
    };
    // returns numalized name is found, undefined if file not found
    ImgCache.prototype.add = function (fullName) {
        var norm = normalizeFileName(fullName);
        if (norm in this.needs)
            return norm;
        this.needs[norm] = true;
        var ii = this.fn2Info[norm];
        if (ii !== undefined) {
            try {
                var stats = fs.statSync(fullName);
                if (!stats.isFile())
                    return undefined;
                ii.modified = stats.mtime;
                if (ii.modified !== ii.oldModified)
                    this.someChange = true;
            }
            catch (er) {
                return undefined;
            }
            return norm;
        }
        ii = {
            fullName: fullName,
            normalizedFullName: norm,
            oldModified: null,
            modified: null,
            width: 0,
            height: 0,
            img: null
        };
        this.fn2Info[norm] = ii;
        try {
            var stats = fs.statSync(fullName);
            if (!stats.isFile())
                return undefined;
            ii.modified = stats.mtime;
            this.someChange = true;
        }
        catch (er) {
            return undefined;
        }
        return norm;
    };
    ImgCache.prototype.load = function (onLoaded) {
        var prom = Promise.resolve(null);
        for (var i in this.needs) {
            var info = this.fn2Info[i];
            (function (inf) {
                prom = prom.then(function () {
                    return imageOps.loadPNG(inf.fullName).then(function (img) {
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
    };
    return ImgCache;
}());
exports.ImgCache = ImgCache;
var ImgBundleCache = (function () {
    function ImgBundleCache(imgCache) {
        this.imgCache = imgCache;
        this.old = [];
        this.cur = [];
        this.keys = Object.create(null);
    }
    ImgBundleCache.prototype.clear = function (commit) {
        if (commit)
            this.old = this.cur;
        this.cur = [];
        this.imgCache.clear(commit);
    };
    // returns false if file not found, returns true if ok
    ImgBundleCache.prototype.add = function (fullName, color, width, height, x, y) {
        var norm = this.imgCache.add(fullName);
        if (norm === undefined)
            return false;
        var key = norm + "|" + (color || "") + "|" + (width || -1) + "|" + (height || -1) + "|" + (x || 0) + "|" + (y || 0);
        if (key in this.keys)
            return true;
        var v = {
            key: key, normalizedFullName: norm, color: color, width: width, height: height, x: x, y: y, bwidth: undefined, bheight: undefined, bx: undefined, by: undefined
        };
        this.cur.push(v);
        this.keys[key] = v;
        return true;
    };
    ImgBundleCache.prototype.wasChange = function () {
        if (this.cur.length === 0)
            return false;
        this.cur.sort(function (l, r) { if (l.key < r.key)
            return -1; if (l.key > r.key)
            return 1; return 0; });
        if (this.old.length != this.cur.length)
            return true;
        if (this.imgCache.wasChange())
            return true;
        for (var i = 0; i < this.cur.length; i++) {
            if (this.old[i].key !== this.cur[i].key)
                return true;
        }
        return false;
    };
    ImgBundleCache.prototype.build = function () {
        var _this = this;
        var bundle = [];
        var prom = this.imgCache.load(function (inf) {
            for (var i = 0; i < _this.cur.length; i++) {
                var c = _this.cur[i];
                if (c.normalizedFullName === inf.normalizedFullName) {
                    if (c.width != null)
                        c.bwidth = c.width;
                    else
                        c.bwidth = inf.width;
                    if (c.height != null)
                        c.bheight = c.height;
                    else
                        c.bheight = inf.height;
                    bundle.push({
                        inf: inf, ibi: c, width: c.bwidth, height: c.bheight, x: 0, y: 0
                    });
                }
            }
        });
        return prom.then(function () {
            var dim = spriter.spritePlace(bundle);
            var bundleImg = imageOps.createImage(dim[0], dim[1]);
            for (var i = 0; i < bundle.length; i++) {
                var c = bundle[i];
                c.ibi.bx = c.x;
                c.ibi.by = c.y;
                var img = c.inf.img;
                if (c.ibi.color) {
                    img = imageOps.cloneImage(img);
                    imageOps.replaceColor(img, c.ibi.color);
                }
                imageOps.drawImage(img, bundleImg, c.x, c.y, c.ibi.x || 0, c.ibi.y || 0, c.width, c.height);
            }
            return bundleImg;
        });
    };
    ImgBundleCache.prototype.query = function (fullName, color, width, height, x, y) {
        var norm = this.imgCache.add(fullName);
        if (norm === undefined)
            throw Error("querying not added file " + fullName);
        var key = norm + "|" + (color || "") + "|" + (width || -1) + "|" + (height || -1) + "|" + (x || 0) + "|" + (y || 0);
        var v = this.keys[key];
        if (v === undefined)
            throw Error("querying not added combination " + key);
        return { width: v.bwidth, height: v.bheight, x: v.bx, y: v.by };
    };
    return ImgBundleCache;
}());
exports.ImgBundleCache = ImgBundleCache;
