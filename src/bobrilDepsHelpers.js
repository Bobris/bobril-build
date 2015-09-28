var pathUtils = require('./pathUtils');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require('fs');
require('bluebird');
function systemJsPath() {
    return path.join(pathUtils.dirOfNodeModule('systemjs'), 'dist');
}
exports.systemJsPath = systemJsPath;
function systemJsFiles() {
    return ['system.js', 'system-polyfills.js'];
}
exports.systemJsFiles = systemJsFiles;
function numeralJsPath() {
    return pathUtils.dirOfNodeModule('numeral');
}
exports.numeralJsPath = numeralJsPath;
function numeralJsFiles() {
    return ['numeral.js'];
}
exports.numeralJsFiles = numeralJsFiles;
function momentJsPath() {
    return pathUtils.dirOfNodeModule('moment');
}
exports.momentJsPath = momentJsPath;
function momentJsFiles() {
    return ['moment.js'];
}
exports.momentJsFiles = momentJsFiles;
function systemJsBasedIndexHtml(mainRequire, moduleMap, title) {
    title = title || 'Bobril Application';
    return "<html>\n    <head>\n        <meta charset=\"utf-8\">\n        <title>" + title + "</title>\n    </head>\n    <body>\n        <script type=\"text/javascript\" src=\"system.js\" charset=\"utf-8\"></script>\n        <script type=\"text/javascript\">\n            System.config({\n                baseURL: '/',\n                defaultJSExtensions: true,\n                map: " + JSON.stringify(moduleMap) + "\n            });\n            System.import('" + mainRequire + "');\n        </script>\n    </body>\n</html>\n";
}
exports.systemJsBasedIndexHtml = systemJsBasedIndexHtml;
function writeDir(write, dir, files) {
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        write(f, fs.readFileSync(path.join(dir, f)));
    }
}
function writeSystemJsBasedDist(write, mainRequire, moduleMap) {
    var prom = Promise.resolve(null);
    write('index.html', new Buffer(systemJsBasedIndexHtml(mainRequire, moduleMap)));
    writeDir(write, systemJsPath(), systemJsFiles());
    return prom;
}
exports.writeSystemJsBasedDist = writeSystemJsBasedDist;
function updateIndexHtml(project) {
    var moduleNames = Object.keys(project.moduleMap);
    var moduleMap = Object.create(null);
    for (var i = 0; i < moduleNames.length; i++) {
        var name_1 = moduleNames[i];
        if (project.moduleMap[name_1].internalModule)
            continue;
        moduleMap[name_1] = project.moduleMap[name_1].jsFile;
    }
    var newIndexHtml = systemJsBasedIndexHtml(project.mainJsFile, moduleMap, project.htmlTitle);
    if (newIndexHtml !== project.lastwrittenIndexHtml) {
        project.writeFileCallback('index.html', new Buffer(newIndexHtml));
        project.lastwrittenIndexHtml = newIndexHtml;
    }
}
exports.updateIndexHtml = updateIndexHtml;
function findLocaleFile(filePath, locale, ext) {
    var improved = false;
    while (true) {
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
    resbufs.push(new Buffer('bobrilRegisterTranslations(\'' + locale + '\',[', 'utf-8'));
    var pluralFn = pluralFns[getLanguageFromLocale(locale)];
    if (pluralFn) {
        resbufs.push(new Buffer(pluralFn.toString(), 'utf-8'));
    }
    else {
        resbufs.push(new Buffer('function(){return\'other\';}', 'utf-8'));
    }
    resbufs.push(new Buffer('],', 'utf-8'));
    resbufs.push(new Buffer(JSON.stringify(translationMessages), 'utf-8'));
    resbufs.push(new Buffer(')', 'utf-8'));
    write(filename, Buffer.concat(resbufs));
}
exports.writeTranslationFile = writeTranslationFile;
function writeDirFromCompilationCache(cc, write, dir, files) {
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        cc.copyToProjectIfChanged(f, dir, f, write);
    }
}
function updateSystemJsByCC(cc, write) {
    writeDirFromCompilationCache(cc, write, systemJsPath(), systemJsFiles());
}
exports.updateSystemJsByCC = updateSystemJsByCC;
