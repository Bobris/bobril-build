import * as path from 'path';
import * as fs from 'fs';
require('bluebird');

export function systemJsPath(): string {
    return path.join(path.dirname(require.resolve('systemjs')), 'dist');
}

export function systemJsFiles(): string[] {
    return ['system.js', 'system-polyfills.js'];
}

export function numeralJsPath(): string {
    return path.dirname(require.resolve('numeral'));
}

export function numeralJsFiles(): string[] {
    return ['numeral.js'];
}

export function momentJsPath(): string {
    return path.dirname(require.resolve('moment'));
}

export function momentJsFiles(): string[] {
    return ['moment.js'];
}

export function systemJsBasedIndexHtml(mainRequire: string) {
    return `<html>
    <head>
        <meta charset="utf-8">
        <title>Bobril Application</title>
    </head>
    <body>
        <script type="text/javascript" src="system.js" charset="utf-8"></script>
        <script type="text/javascript">
            System.config({
                'baseURL': '/',
                'defaultJSExtensions': true,
            });
            System.import('${mainRequire}');
        </script>
    </body>
</html>
`;
}

function writeDir(write: (fn: string, b: Buffer) => void, dir: string, files: string[]) {
    for (let i = 0; i < files.length; i++) {
        let f = files[i];
        write(f, fs.readFileSync(path.join(dir, f)));
    }
}

export function writeSystemJsBasedDist(write: (fn: string, b: Buffer) => void, mainRequire: string): Promise<any> {
    let prom = Promise.resolve(null);
    write('index.html', new Buffer(systemJsBasedIndexHtml(mainRequire)));
    writeDir(write, systemJsPath(), systemJsFiles());
    writeDir(write, numeralJsPath(), numeralJsFiles());
    writeDir(write, momentJsPath(), momentJsFiles());
    return prom;
}

function findLocaleFile(filePath: string, locale: string, ext: string): string {
    let improved = false;
    while (true) {
        if (fs.existsSync(path.join(filePath, locale + ext))) {
            return path.join(filePath, locale + ext);
        }
        if (improved)
            throw new Error('Improvement to ' + locale + ' failed');
        let dashPos = locale.lastIndexOf('-');
        if (dashPos < 0)
            return null;
        locale = locale.substr(0, dashPos);
    }
}

const pluralFns = require('make-plural');

function getLanguageFromLocale(locale: string): string {
    let idx = locale.indexOf('-');
    if (idx >= 0)
        return locale.substr(0, idx);
    return locale;
}

export function writeTranslationFile(locale: string, translationMessages: string[], filename: string, write: (fn: string, b: Buffer) => void) {
    let resbufs: Buffer[] = [];
    if (locale === 'en' || /^en-us/i.test(locale)) {
        // English is always included
    } else {
        let fn = findLocaleFile(path.join(numeralJsPath(), 'min', 'languages'), locale, '.min.js');
        if (fn) {
            resbufs.push(fs.readFileSync(fn));
            resbufs.push(new Buffer('\n', 'utf-8'));
        }
        fn = findLocaleFile(path.join(momentJsPath(), 'locale'), locale, '.js');
        if (fn) {
            resbufs.push(fs.readFileSync(fn));
            resbufs.push(new Buffer('\n', 'utf-8'));
        }
    }
    resbufs.push(new Buffer('bobrilRegisterTranslations(\'' + locale + '\',[', 'utf-8'));
    let pluralFn = pluralFns[getLanguageFromLocale(locale)];
    if (pluralFn) {
        resbufs.push(new Buffer(pluralFn.toString(), 'utf-8'));
    } else {
        resbufs.push(new Buffer('function(){return\'other\';}', 'utf-8'));
    }
    resbufs.push(new Buffer('],', 'utf-8'));
    resbufs.push(new Buffer(JSON.stringify(translationMessages), 'utf-8'));
    resbufs.push(new Buffer(')', 'utf-8'));
    write(filename, Buffer.concat(resbufs));
}
