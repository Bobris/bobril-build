import * as fs from 'fs';
import * as BuildHelpers from './buildHelpers';

const indexOfLangsMessages = 4;

class TranslationDb {
    // 0 - english message
    // 1 - hint
    // 2 - withParams&1 temporary&2 used&4
    // 3 - message id
    // 4+ - message in langs[idx-4]
    db: { [messsageAndHint: string]: (string|number)[] };
    langs: string[];

    constructor() {
        this.clear();
    }

    clear() {
        this.db = Object.create(null);
        this.langs = [];
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
        let pos = this.langs.indexOf(name);
        if (pos < 0) return;
        pos += indexOfLangsMessages;
        for (let key in this.db) {
            let tr = this.db[key];
            tr.splice(pos, 1);
        }
    }

    saveLangDb(filename: string, lang: string) {
        let pos = this.langs.indexOf(name);
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

    addUsageOfMessage(info: BuildHelpers.TranslationMessage) {
        
    }
}
