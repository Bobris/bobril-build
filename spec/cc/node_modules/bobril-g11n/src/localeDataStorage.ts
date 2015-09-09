let defs: {
    [locale: string]: {
        pluralFn?: (val: number, ordinal: boolean) => string,
    }
} = Object.create(null);

defs['en'] = {
    pluralFn(n: number, ord: boolean) {
        var s = String(n).split("."), v0 = !s[1], t0 = Number(s[0]) == n, n10:any = t0 && s[0].slice(-1), n100:any = t0 && s[0].slice(-2);
        if (ord) return n10 == 1 && n100 != 11 ? "one" : n10 == 2 && n100 != 12 ? "two" : n10 == 3 && n100 != 13 ? "few" : "other"; return n == 1 && v0 ? "one" : "other"
    }
};

export function setPluralRule(locale: string, pluralFn: (val: number, ordinal: boolean) => string) {
    let d = defs[locale];
    if (d === undefined) {
        d = {};
    }
    d.pluralFn = pluralFn;
    defs[locale] = <any>d;
}

export function getLanguageFromLocale(locale: string): string {
    let idx = locale.indexOf('-');
    if (idx >= 0)
        return locale.substr(0, idx);
    return locale;
}

export function getPluralRule(locale: string): (val: number, ordinal: boolean) => string {
    let d = defs[locale];
    if (!d) {
        d = defs[getLanguageFromLocale(locale)];
        if (!d) {
            d = defs['en'];
        }
    }
    return d.pluralFn;
}
