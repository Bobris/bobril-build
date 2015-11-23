import * as fs from 'fs';
import * as BuildHelpers from './buildHelpers';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as pathUtils from "./pathUtils";

const indexOfLangsMessages = 4;

export class TranslationDb {
    // 0 - english message
    // 1 - hint
    // 2 - withParams&1 temporary&2 used&4
    // 3 - message id
    // 4+ - message in langs[idx-4]
    db: { [messsageAndHint: string]: (string | number)[] };
    usedKeyList: string[];
    temporaryKeyList: string[];
    langs: string[];

    constructor() {
        this.clear();
    }

    clear() {
        this.db = Object.create(null);
        this.langs = [];
        this.usedKeyList = [];
        this.temporaryKeyList = [];
    }

    addLang(name: string): number {
        let pos = this.langs.indexOf(name);
        if (pos >= 0) return pos;
        this.langs.push(name);
        return this.langs.length - 1;
    }

    buildKey(message: string, hint: string, hasParams: boolean) {
        return message + '\x01\x02' + (hasParams ? '#' : '-') + (hint || '');
    }

    loadLangDbs(dir: string) {
        let trFiles: string[];
        try {
            trFiles = fs.readdirSync(dir).filter(v=> /\.json$/i.test(v));
        } catch (err) {
            // ignore errors
            return;
        }
        trFiles.forEach(v=> {
            this.loadLangDb(path.join(dir, v));
        });
    }

    loadLangDb(fileName: string) {
        let json = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
        if (!Array.isArray(json)) throw new Error('root object is not array');
        if (json.length === 0)
            throw new Error('array cannot be empty');
        let lang = json[0];
        if (typeof lang !== 'string') throw new Error('first item must be string');
        let langidx = indexOfLangsMessages + this.addLang(lang);
        for (let i = 1; i < json.length; i++) {
            let item = json[i];
            if (!Array.isArray(item))
                throw new Error('items must be array');
            if (item.length !== 3 || item.length !== 4)
                throw new Error('items must have length==3 or 4');
            let message = item[0];
            let hint = item[1];
            let flags = item[2];
            if (typeof message !== 'string') throw new Error('item[0] must be message string');
            if (hint != null && typeof hint !== 'string') throw new Error('item[1] must be hint string or null');
            if (typeof flags !== 'number') throw new Error('item[2] must be flags number');
            let key = this.buildKey(item[0], item[1], (item[2] & 1) !== 0);
            let tr = this.db[key];
            if (tr) {
                if (item.length === 4) {
                    tr[langidx] = item[3];
                }
            } else {
                tr = [message, hint, flags, null];
                if (item.length === 4) {
                    tr[langidx] = item[3];
                }
                this.db[key] = tr;
            }
        }
    }

    removeLang(lang: string) {
        let pos = this.langs.indexOf(lang);
        if (pos < 0) return;
        pos += indexOfLangsMessages;
        for (let key in this.db) {
            let tr = this.db[key];
            tr.splice(pos, 1);
        }
    }

    saveLangDbs(dir: string) {
        pathUtils.mkpathsync(dir);
        this.langs.forEach(lang=> {
            this.saveLangDb(path.join(dir, lang + ".json"), lang);
        });
    }

    saveLangDb(filename: string, lang: string) {
        let pos = this.langs.indexOf(lang);
        if (pos < 0) pos = this.langs.length;
        pos += indexOfLangsMessages;
        let items = <any[]>[lang];
        for (let key in this.db) {
            let tr = this.db[key];
            let trl = tr[pos];
            if (trl != null) {
                items.push([tr[0], tr[1], <number>tr[2] & 1, trl]);
            } else {
                items.push([tr[0], tr[1], <number>tr[2] & 1]);
            }
        }
        fs.writeFileSync(filename, JSON.stringify(items));
    }

    addUsageOfMessage(info: BuildHelpers.TranslationMessage): number {
        let key = this.buildKey(<string>info.message, info.hint, info.withParams);
        let item = this.db[key];
        if (item === undefined) {
            item = [info.message, info.hint, (info.withParams ? 1 : 0) | 2 | 4, this.usedKeyList.length]; // add as temporary and as used
            this.db[key] = item;
            this.usedKeyList.push(key);
            this.temporaryKeyList.push(key);
        } else {
            if (((<number>item[2]) & 4) === 0) {
                item[2] = (<number>item[2]) | 4; // add used flag
                item[3] = this.usedKeyList.length;
                this.usedKeyList.push(key);
            }
        }
        return <number>item[3];
    }

    clearUsedFlags() {
        let list = this.usedKeyList;
        let db = this.db;
        for (let i = 0; i < list.length; i++) {
            let item = db[list[i]];
            item[2] = (<number>item[2]) & ~4;
        }
        list.length = 0;
    }

    clearTemporaryFlags() {
        let list = this.temporaryKeyList;
        let db = this.db;
        for (let i = 0; i < list.length; i++) {
            let item = db[list[i]];
            item[2] = (<number>item[2]) & ~2;
        }
        list.length = 0;
    }

    pruneDbOfTemporaryUnused() {
        let list = this.temporaryKeyList;
        let db = this.db;
        for (let i = 0; i < list.length; i++) {
            let key = list[i];
            let item = db[key];
            if ((<number>item[2] & 4) === 0) { // not used
                delete db[key];
                list.splice(i, 1); i--;
            }
        }
    }

    getTemporaryStringsCount(): number {
        return this.temporaryKeyList.length;
    }

    getMessageArrayInLang(lang: string): string[] {
        let pos = this.langs.indexOf(lang);
        if (pos < 0) pos = this.langs.length;
        pos += indexOfLangsMessages;
        let result = [];
        let list = this.usedKeyList;
        let db = this.db;
        for (let i = 0; i < list.length; i++) {
            let item = db[list[i]];
            if (item[pos] != null) {
                result.push(item[pos]);
            } else {
                result.push(item[0]); // English as fallback
            }
        }
        return result;
    }

    getForTranslationLang(lang: string): [string, string, string, number, string][] {
        let pos = this.langs.indexOf(lang);
        if (pos < 0) pos = this.langs.length;
        pos += indexOfLangsMessages;
        let result = [];
        let list = this.usedKeyList;
        let db = this.db;
        for (let i = 0; i < list.length; i++) {
            let item = db[list[i]];
            if (item[pos] != null)
                continue;
            result.push([null, item[0], item[1], <number>item[2] & 1, list[i]]);
        }
        return result;
    }

    setForTranslationLang(lang: string, trs: [string, string, string, number, string][]) {
        let pos = this.langs.indexOf(lang);
        if (pos < 0) pos = this.langs.length;
        pos += indexOfLangsMessages;
        let db = this.db;
        for (let i = 0; i < trs.length; i++) {
            let row = trs[i];
            if (typeof row[0] !== 'string') continue;
            let item = db[row[4]];
            item[pos] = row[0];
        }
    }
}
