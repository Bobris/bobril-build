var path = require('path');
var fs = require('fs');
require('bluebird');
function systemJsPath() {
    return path.join(path.dirname(require.resolve('systemjs')), 'dist');
}
exports.systemJsPath = systemJsPath;
function systemJsFiles() {
    return ['system.js', 'system-polyfills.js'];
}
exports.systemJsFiles = systemJsFiles;
function numeralJsPath() {
    return path.dirname(require.resolve('numeral'));
}
exports.numeralJsPath = numeralJsPath;
function numeralJsFiles() {
    return ['numeral.js'];
}
exports.numeralJsFiles = numeralJsFiles;
function momentJsPath() {
    return path.dirname(require.resolve('moment'));
}
exports.momentJsPath = momentJsPath;
function momentJsFiles() {
    return ['moment.js'];
}
exports.momentJsFiles = momentJsFiles;
function systemJsBasedIndexHtml(mainRequire) {
    return "<html>\n    <head>\n        <meta charset=\"utf-8\">\n        <title>Bobril Application</title>\n    </head>\n    <body>\n        <script type=\"text/javascript\" src=\"system.js\" charset=\"utf-8\"></script>\n        <script type=\"text/javascript\">\n            System.config({\n                'baseURL': '/',\n                'defaultJSExtensions': true,\n            });\n            System.import('numeral.js');\n            System.import('moment.js');\n            System.import('" + mainRequire + "');\n        </script>\n    </body>\n</html>\n";
}
exports.systemJsBasedIndexHtml = systemJsBasedIndexHtml;
function writeDir(write, dir, files) {
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        write(f, fs.readFileSync(path.join(dir, f)));
    }
}
function writeSystemJsBasedDist(write, mainRequire) {
    var prom = Promise.resolve(null);
    write('index.html', new Buffer(systemJsBasedIndexHtml(mainRequire)));
    writeDir(write, systemJsPath(), systemJsFiles());
    writeDir(write, numeralJsPath(), numeralJsFiles());
    writeDir(write, momentJsPath(), momentJsFiles());
    return prom;
}
exports.writeSystemJsBasedDist = writeSystemJsBasedDist;
function findLocaleFile(filePath, locale, ext) {
    var improved = false;
    while (true) {
        console.log(locale);
        if (fs.existsSync(path.join(filePath, locale + ext))) {
            return path.join(filePath, locale + ext);
        }
        if (improved)
            throw new Error('Improvement to ' + locale + ' failed');
        var dashPos = locale.lastIndexOf('-');
        if (dashPos < 0)
            return null;
        locale = locale.substr(0, dashPos);
    }
}
var pluralFns = require('make-plural');
function getLanguageFromLocale(locale) {
    var idx = locale.indexOf('-');
    if (idx >= 0)
        return locale.substr(0, idx);
    return locale;
}
function writeTranslationFile(locale, translationMessages, filename, write) {
    var resbufs = [];
    if (locale === 'en' || /^en-us/i.test(locale)) {
    }
    else {
        var fn = findLocaleFile(path.join(numeralJsPath(), 'min', 'languages'), locale, '.min.js');
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
    resbufs.push(new Buffer('bobrilRegisterTranslations(\'' + locale + '\',', 'utf-8'));
    var pluralFn = pluralFns[getLanguageFromLocale(locale)];
    if (pluralFn) {
        resbufs.push(new Buffer(pluralFn.toString(), 'utf-8'));
    }
    else {
        resbufs.push(new Buffer('function(){return\'other\';}', 'utf-8'));
    }
    resbufs.push(new Buffer(',', 'utf-8'));
    resbufs.push(new Buffer(JSON.stringify(translationMessages), 'utf-8'));
    resbufs.push(new Buffer(')', 'utf-8'));
    write(filename, Buffer.concat(resbufs));
}
exports.writeTranslationFile = writeTranslationFile;
