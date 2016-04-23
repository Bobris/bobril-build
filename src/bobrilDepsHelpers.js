"use strict";
var pathUtils = require('./pathUtils');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require('fs');
require('bluebird');
var simpleHelpers_1 = require('./simpleHelpers');
function systemJsPath() {
    return path.join(pathUtils.dirOfNodeModule('systemjs'), 'dist');
}
exports.systemJsPath = systemJsPath;
function systemJsFiles() {
    return ['system.js', 'system-polyfills.js'];
}
exports.systemJsFiles = systemJsFiles;
function loaderJsPath() {
    return __dirname.replace(/\\/g, "/");
}
exports.loaderJsPath = loaderJsPath;
function loaderJsFiles() {
    return ["loader.js"];
}
exports.loaderJsFiles = loaderJsFiles;
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
function linkCss(project) {
    return project.cssToLink.map(function (n) { return ("<link rel=\"stylesheet\" href=\"" + n + "\">"); }).join("");
}
function systemJsBasedIndexHtml(project) {
    var title = project.htmlTitle || 'Bobril Application';
    var moduleNames = Object.keys(project.moduleMap);
    var moduleMap = Object.create(null);
    for (var i = 0; i < moduleNames.length; i++) {
        var name_1 = moduleNames[i];
        if (project.moduleMap[name_1].internalModule)
            continue;
        moduleMap[name_1] = project.moduleMap[name_1].jsFile;
    }
    return "<!DOCTYPE html><html>\n    <head>\n        <meta charset=\"utf-8\">" + project.htmlHeadExpanded + "\n        <title>" + title + "</title>" + linkCss(project) + "\n    </head>\n    <body>" + g11nInit(project) + "\n        <script type=\"text/javascript\" src=\"system.js\" charset=\"utf-8\"></script>\n        <script type=\"text/javascript\">\n            " + simpleHelpers_1.globalDefines(project.defines) + "\n            System.config({\n                baseURL: '/',\n                defaultJSExtensions: true,\n                map: " + JSON.stringify(moduleMap) + "\n            });\n            System.import('" + project.mainJsFile + "');\n        </script>\n    </body>\n</html>\n";
}
exports.systemJsBasedIndexHtml = systemJsBasedIndexHtml;
function g11nInit(project) {
    if (!project.localize && !project.bundlePng)
        return "";
    var res = "<script>";
    if (project.localize) {
        res += "function g11nPath(s){return \"./" + (project.outputSubDir ? (project.outputSubDir + "/") : "") + "\"+s+\".js\"};";
    }
    if (project.bundlePng) {
        res += "var bobrilBPath=\"" + project.bundlePng + "\"";
    }
    res += "</script>";
    return res;
}
function bundleBasedIndexHtml(project) {
    var title = project.htmlTitle || 'Bobril Application';
    return "<!DOCTYPE html><html><head><meta charset=\"utf-8\">" + project.htmlHeadExpanded + "<title>" + title + "</title>" + linkCss(project) + "</head><body>" + g11nInit(project) + "<script type=\"text/javascript\" src=\"" + (project.bundleJs || "bundle.js") + "\" charset=\"utf-8\"></script></body></html>";
}
exports.bundleBasedIndexHtml = bundleBasedIndexHtml;
function fastBundleBasedIndexHtml(project) {
    var title = project.htmlTitle || 'Bobril Application';
    var moduleNames = Object.keys(project.moduleMap);
    var moduleMap = Object.create(null);
    for (var i = 0; i < moduleNames.length; i++) {
        var name_2 = moduleNames[i];
        if (project.moduleMap[name_2].internalModule)
            continue;
        moduleMap[name_2] = project.moduleMap[name_2].jsFile.replace(/\.js$/i, "");
    }
    return "<!DOCTYPE html><html>\n    <head>\n        <meta charset=\"utf-8\">" + project.htmlHeadExpanded + "\n        <title>" + title + "</title>" + linkCss(project) + "\n    </head>\n    <body>" + g11nInit(project) + "\n        <script type=\"text/javascript\" src=\"loader.js\" charset=\"utf-8\"></script>\n        <script type=\"text/javascript\">\n            " + simpleHelpers_1.globalDefines(project.defines) + "\n            R.map = " + JSON.stringify(moduleMap) + "\n        </script>\n        <script type=\"text/javascript\" src=\"" + (project.bundleJs || "bundle.js") + "\" charset=\"utf-8\"></script>\n        <script type=\"text/javascript\">\n            R.r('" + project.realRootRel + project.mainJsFile.replace(/\.js$/i, "") + "');\n        </script>\n    </body>\n</html>\n";
}
exports.fastBundleBasedIndexHtml = fastBundleBasedIndexHtml;
function fastBundleBasedTestHtml(project) {
    var title = 'Jasmine Test';
    var moduleNames = Object.keys(project.moduleMap);
    var moduleMap = Object.create(null);
    for (var i = 0; i < moduleNames.length; i++) {
        var name_3 = moduleNames[i];
        if (project.moduleMap[name_3].internalModule)
            continue;
        moduleMap[name_3] = project.moduleMap[name_3].jsFile.replace(/\.js$/i, "");
    }
    var reqSpec = project.mainSpec.filter(function (v) { return !/\.d.ts$/i.test(v); }).map(function (v) { return ("R.r('" + project.realRootRel + v.replace(/\.tsx?$/i, "") + "');"); }).join(' ');
    return "<!DOCTYPE html><html>\n    <head>\n        <meta charset=\"utf-8\">" + project.htmlHeadExpanded + "\n        <title>" + title + "</title>" + linkCss(project) + "\n    </head>\n    <body>" + g11nInit(project) + "\n        <script type=\"text/javascript\" src=\"bb/special/jasmine-core.js\" charset=\"utf-8\"></script>\n        <script type=\"text/javascript\" src=\"bb/special/jasmine-boot.js\" charset=\"utf-8\"></script>\n        <script type=\"text/javascript\" src=\"bb/special/loader.js\" charset=\"utf-8\"></script>\n        <script type=\"text/javascript\">\n            " + simpleHelpers_1.globalDefines(project.defines) + "\n            R.map = " + JSON.stringify(moduleMap) + "\n        </script>\n        <script type=\"text/javascript\" src=\"" + (project.bundleJs || "bundle.js") + "\" charset=\"utf-8\"></script>\n        <script type=\"text/javascript\">\n            " + reqSpec + "\n        </script>\n    </body>\n</html>\n";
}
exports.fastBundleBasedTestHtml = fastBundleBasedTestHtml;
function writeDir(write, dir, files) {
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        write(f, fs.readFileSync(path.join(dir, f)));
    }
}
function updateIndexHtml(project) {
    var newIndexHtml;
    if (project.totalBundle) {
        newIndexHtml = bundleBasedIndexHtml(project);
    }
    else if (project.fastBundle) {
        newIndexHtml = fastBundleBasedIndexHtml(project);
    }
    else {
        newIndexHtml = systemJsBasedIndexHtml(project);
    }
    if (newIndexHtml !== project.lastwrittenIndexHtml) {
        project.writeFileCallback('index.html', new Buffer(newIndexHtml));
        project.lastwrittenIndexHtml = newIndexHtml;
    }
}
exports.updateIndexHtml = updateIndexHtml;
function updateTestHtml(project) {
    var newIndexHtml;
    newIndexHtml = fastBundleBasedTestHtml(project);
    project.writeFileCallback('test.html', new Buffer(newIndexHtml));
}
exports.updateTestHtml = updateTestHtml;
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
function updateLoaderJsByCC(cc, write) {
    writeDirFromCompilationCache(cc, write, loaderJsPath(), loaderJsFiles());
}
exports.updateLoaderJsByCC = updateLoaderJsByCC;
