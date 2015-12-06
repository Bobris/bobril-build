var fs = require('fs');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var pathUtils = require("./pathUtils");
var indexOfLangsMessages = 4;
var TranslationDb = (function () {
    function TranslationDb() {
        this.clear();
    }
    TranslationDb.prototype.clear = function () {
        this.db = Object.create(null);
        this.langs = [];
        this.usages = Object.create(null);
        this.availNumbers = [];
        this.nextFreeId = 0;
        this.changeInMessageIds = false;
    };
    TranslationDb.prototype.addLang = function (name) {
        var pos = this.langs.indexOf(name);
        if (pos >= 0)
            return pos;
        this.langs.push(name);
        return this.langs.length - 1;
    };
    TranslationDb.prototype.buildKey = function (message, hint, hasParams) {
        return message + '\x01\x02' + (hasParams ? '#' : '-') + (hint || '');
    };
    TranslationDb.prototype.loadLangDbs = function (dir) {
        var _this = this;
        var trFiles;
        try {
            trFiles = fs.readdirSync(dir).filter(function (v) { return /\.json$/i.test(v); });
        }
        catch (err) {
            // ignore errors
            return;
        }
        trFiles.forEach(function (v) {
            _this.loadLangDb(path.join(dir, v));
        });
    };
    TranslationDb.prototype.loadLangDb = function (fileName) {
        var json = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
        if (!Array.isArray(json))
            throw new Error('root object is not array');
        if (json.length === 0)
            throw new Error('array cannot be empty');
        var lang = json[0];
        if (typeof lang !== 'string')
            throw new Error('first item must be string');
        var langidx = indexOfLangsMessages + this.addLang(lang);
        for (var i = 1; i < json.length; i++) {
            var item = json[i];
            if (!Array.isArray(item))
                throw new Error('items must be array');
            if (item.length !== 3 || item.length !== 4)
                throw new Error('items must have length==3 or 4');
            var message = item[0];
            var hint = item[1];
            var flags = item[2];
            if (typeof message !== 'string')
                throw new Error('item[0] must be message string');
            if (hint != null && typeof hint !== 'string')
                throw new Error('item[1] must be hint string or null');
            if (typeof flags !== 'number')
                throw new Error('item[2] must be flags number');
            var key = this.buildKey(item[0], item[1], (item[2] & 1) !== 0);
            var tr = this.db[key];
            if (tr) {
                if (item.length === 4) {
                    tr[langidx] = item[3];
                }
            }
            else {
                tr = [message, hint, flags, null];
                if (item.length === 4) {
                    tr[langidx] = item[3];
                }
                this.db[key] = tr;
            }
        }
    };
    TranslationDb.prototype.removeLang = function (lang) {
        var pos = this.langs.indexOf(lang);
        if (pos < 0)
            return;
        pos += indexOfLangsMessages;
        for (var key in this.db) {
            var tr = this.db[key];
            tr.splice(pos, 1);
        }
    };
    TranslationDb.prototype.saveLangDbs = function (dir) {
        var _this = this;
        pathUtils.mkpathsync(dir);
        this.langs.forEach(function (lang) {
            _this.saveLangDb(path.join(dir, lang + ".json"), lang);
        });
    };
    TranslationDb.prototype.saveLangDb = function (filename, lang) {
        var pos = this.langs.indexOf(lang);
        if (pos < 0)
            pos = this.langs.length;
        pos += indexOfLangsMessages;
        var items = [lang];
        for (var key in this.db) {
            var tr = this.db[key];
            var trl = tr[pos];
            if (trl != null) {
                items.push([tr[0], tr[1], tr[2] & 1, trl]);
            }
            else {
                items.push([tr[0], tr[1], tr[2] & 1]);
            }
        }
        fs.writeFileSync(filename, JSON.stringify(items));
    };
    TranslationDb.prototype.pruneUnusedMesssages = function () {
        var list = Object.keys(this.db);
        for (var i = 0; i < list.length; i++) {
            var tr = this.db[list[i]];
            if (tr[2] < 2) {
                delete this.db[list[i]];
            }
        }
    };
    TranslationDb.prototype.allocId = function () {
        if (this.availNumbers.length === 0) {
            return this.nextFreeId++;
        }
        return this.availNumbers.pop();
    };
    TranslationDb.prototype.freeId = function (id) {
        this.availNumbers.push(id);
    };
    TranslationDb.prototype.clearBeforeCompilation = function () {
        this.changeInMessageIds = false;
        this.addedMessage = false;
    };
    TranslationDb.prototype.startCompileFile = function (fn) {
        this.currentFileUsages = this.usages[fn];
        this.newFileUsages = undefined; // lazy allocated for speed
    };
    TranslationDb.prototype.addUsageOfMessage = function (info) {
        var key = this.buildKey(info.message, info.hint, info.withParams);
        if (this.newFileUsages === undefined)
            this.newFileUsages = Object.create(null);
        if (this.currentFileUsages !== undefined && this.currentFileUsages[key] === true) {
            var item_1 = this.db[key];
            delete this.currentFileUsages[key];
            this.newFileUsages[key] = true;
            return item_1[3];
        }
        var item = this.db[key];
        if (this.newFileUsages[key] === true) {
            return item[3];
        }
        this.newFileUsages[key] = true;
        if (item === undefined) {
            item = [info.message, info.hint, (info.withParams ? 1 : 0) | 2, this.allocId()]; // add as allocated
            this.changeInMessageIds = true;
            this.addedMessage = true;
            this.db[key] = item;
            return item[3];
        }
        if ((item[2] & 2) === 0) {
            item[2] = item[2] | 2; // add allocated flag
            item[3] = this.allocId();
            this.changeInMessageIds = true;
        }
        else {
            item[2] = item[2] + 2; // increase allocated flag
        }
        return item[3];
    };
    TranslationDb.prototype.finishCompileFile = function (fn) {
        if (this.currentFileUsages !== undefined) {
            var keys = Object.keys(this.currentFileUsages);
            for (var i = 0; i < keys.length; i++) {
                var item = this.db[keys[i]];
                item[2] = item[2] - 2; // decrease allocated flag
                if (item[2] < 2) {
                    this.freeId(item[3]);
                }
            }
        }
        this.usages[fn] = this.newFileUsages;
    };
    TranslationDb.prototype.getMessageArrayInLang = function (lang) {
        var pos = this.langs.indexOf(lang);
        if (pos < 0)
            pos = this.langs.length;
        pos += indexOfLangsMessages;
        var result = [];
        var db = this.db;
        var list = Object.keys(db);
        for (var i = 0; i < list.length; i++) {
            var item = db[list[i]];
            if (item[2] >= 2) {
                if (item[pos] != null) {
                    result[item[3]] = item[pos];
                }
                else {
                    result[item[3]] = item[0]; // English as fallback
                }
            }
        }
        for (var i = 0; i < result.length; i++) {
            if (result[i] === undefined)
                result[i] = "";
        }
        return result;
    };
    TranslationDb.prototype.getForTranslationLang = function (lang) {
        var pos = this.langs.indexOf(lang);
        if (pos < 0)
            pos = this.langs.length;
        pos += indexOfLangsMessages;
        var result = [];
        var db = this.db;
        var list = Object.keys(db);
        for (var i = 0; i < list.length; i++) {
            var item = db[list[i]];
            if (item[pos] != null)
                continue;
            result.push([null, item[0], item[1], item[2] & 1, list[i]]);
        }
        return result;
    };
    TranslationDb.prototype.setForTranslationLang = function (lang, trs) {
        var pos = this.langs.indexOf(lang);
        if (pos < 0)
            pos = this.langs.length;
        pos += indexOfLangsMessages;
        var db = this.db;
        for (var i = 0; i < trs.length; i++) {
            var row = trs[i];
            if (typeof row[0] !== 'string')
                continue;
            var item = db[row[4]];
            item[pos] = row[0];
        }
    };
    return TranslationDb;
})();
exports.TranslationDb = TranslationDb;
