"use strict";
const pathUtils = require('./pathUtils');
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
const fs = require('fs');
require('bluebird');
const simpleHelpers_1 = require('./simpleHelpers');
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
    return project.cssToLink.map(n => `<link rel="stylesheet" href="${n}">`).join("");
}
function systemJsBasedIndexHtml(project) {
    let title = project.htmlTitle || 'Bobril Application';
    let moduleNames = Object.keys(project.moduleMap);
    let moduleMap = Object.create(null);
    for (let i = 0; i < moduleNames.length; i++) {
        let name = moduleNames[i];
        if (project.moduleMap[name].internalModule)
            continue;
        moduleMap[name] = project.moduleMap[name].jsFile;
    }
    return `<!DOCTYPE html><html>
    <head>
        <meta charset="utf-8">${project.htmlHeadExpanded}
        <title>${title}</title>${linkCss(project)}
    </head>
    <body>${g11nInit(project)}
        <script type="text/javascript" src="system.js" charset="utf-8"></script>
        <script type="text/javascript">
            ${simpleHelpers_1.globalDefines(project.defines)}
            System.config({
                baseURL: '/',
                defaultJSExtensions: true,
                map: ${JSON.stringify(moduleMap)}
            });
            System.import('${project.mainJsFile}');
        </script>
    </body>
</html>
`;
}
exports.systemJsBasedIndexHtml = systemJsBasedIndexHtml;
function g11nInit(project) {
    if (!project.localize && !project.bundlePng)
        return "";
    let res = "<script>";
    if (project.localize) {
        res += `function g11nPath(s){return "./${project.outputSubDir ? (project.outputSubDir + "/") : ""}"+s+".js"};`;
    }
    if (project.bundlePng) {
        res += `var bobrilBPath="${project.bundlePng}"`;
    }
    res += "</script>";
    return res;
}
function bundleBasedIndexHtml(project) {
    let title = project.htmlTitle || 'Bobril Application';
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${project.htmlHeadExpanded}<title>${title}</title>${linkCss(project)}</head><body>${g11nInit(project)}<script type="text/javascript" src="${project.bundleJs || "bundle.js"}" charset="utf-8"></script></body></html>`;
}
exports.bundleBasedIndexHtml = bundleBasedIndexHtml;
function examplesListIndexHtml(fileNames, project) {
    let testList = "";
    for (let i = 0; i < fileNames.length; i++) {
        testList += `<li><a href="${fileNames[i]}">` + path.basename(fileNames[i], ".html") + '</a></li>';
    }
    let title = project.htmlTitle || 'Bobril Application';
    return `<!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8">${project.htmlHeadExpanded}
            <title>${title}</title>${linkCss(project)}
        </head>
        <body>
        <ul>${testList}</ul>
        </body>
    </html>`;
}
exports.examplesListIndexHtml = examplesListIndexHtml;
function getModuleMap(project) {
    let moduleNames = Object.keys(project.moduleMap);
    let moduleMap = Object.create(null);
    for (let i = 0; i < moduleNames.length; i++) {
        let name = moduleNames[i];
        if (project.moduleMap[name].internalModule)
            continue;
        moduleMap[name] = project.moduleMap[name].jsFile.replace(/\.js$/i, "");
    }
    return `R.map = ${JSON.stringify(moduleMap)};`;
}
exports.getModuleMap = getModuleMap;
function fastBundleBasedIndexHtml(project) {
    let title = project.htmlTitle || 'Bobril Application';
    return `<!DOCTYPE html><html>
    <head>
        <meta charset="utf-8">${project.htmlHeadExpanded}
        <title>${title}</title>${linkCss(project)}
    </head>
    <body>${g11nInit(project)}
        <script type="text/javascript" src="loader.js" charset="utf-8"></script>
        <script type="text/javascript">
            ${simpleHelpers_1.globalDefines(project.defines)}
            ${getModuleMap(project)}
        </script>
        <script type="text/javascript" src="${project.bundleJs || "bundle.js"}" charset="utf-8"></script>
        <script type="text/javascript">
            R.r('${project.realRootRel}${project.mainJsFile.replace(/\.js$/i, "")}');
        </script>
    </body>
</html>
`;
}
exports.fastBundleBasedIndexHtml = fastBundleBasedIndexHtml;
function fastBundleBasedTestHtml(project) {
    let title = 'Jasmine Test';
    let reqSpec = project.mainSpec.filter(v => !/\.d.ts$/i.test(v)).map(v => `R.r('${project.realRootRel}${v.replace(/\.tsx?$/i, "")}');`).join(' ');
    return `<!DOCTYPE html><html>
    <head>
        <meta charset="utf-8">${project.htmlHeadExpanded}
        <title>${title}</title>${linkCss(project)}
    </head>
    <body>${g11nInit(project)}
        <script type="text/javascript" src="bb/special/jasmine-core.js" charset="utf-8"></script>
        <script type="text/javascript" src="bb/special/jasmine-boot.js" charset="utf-8"></script>
        <script type="text/javascript" src="bb/special/loader.js" charset="utf-8"></script>
        <script type="text/javascript">
            ${simpleHelpers_1.globalDefines(project.defines)}
            ${getModuleMap(project)}
        </script>
        <script type="text/javascript" src="${project.bundleJs || "bundle.js"}" charset="utf-8"></script>
        <script type="text/javascript">
            ${reqSpec}
        </script>
    </body>
</html>
`;
}
exports.fastBundleBasedTestHtml = fastBundleBasedTestHtml;
function writeDir(write, dir, files) {
    for (let i = 0; i < files.length; i++) {
        let f = files[i];
        write(f, fs.readFileSync(path.join(dir, f)));
    }
}
function updateIndexHtml(project) {
    let newIndexHtml;
    if (project.totalBundle) {
        newIndexHtml = bundleBasedIndexHtml(project);
    }
    else if (project.fastBundle) {
        if (project.mainExamples.length <= 1) {
            newIndexHtml = fastBundleBasedIndexHtml(project);
        }
        else {
            let fileNames = [];
            for (let i = 0; i < project.mainExamples.length; i++) {
                let examplePath = project.mainExamples[i];
                let fileName = path.basename(examplePath).replace(/\.tsx?$/, '.html');
                project.mainJsFile = examplePath.replace(/\.tsx?$/, '.js');
                let content = fastBundleBasedIndexHtml(project);
                project.writeFileCallback(fileName, new Buffer(content));
                fileNames.push(fileName);
            }
            newIndexHtml = examplesListIndexHtml(fileNames, project);
        }
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
    let newIndexHtml;
    newIndexHtml = fastBundleBasedTestHtml(project);
    project.writeFileCallback('test.html', new Buffer(newIndexHtml));
}
exports.updateTestHtml = updateTestHtml;
function findLocaleFile(filePath, locale, ext) {
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
function getLanguageFromLocale(locale) {
    let idx = locale.indexOf('-');
    if (idx >= 0)
        return locale.substr(0, idx);
    return locale;
}
function writeTranslationFile(locale, translationMessages, filename, write) {
    let resbufs = [];
    if (locale === 'en' || /^en-us/i.test(locale)) {
    }
    else {
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
    for (let i = 0; i < files.length; i++) {
        let f = files[i];
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
//# sourceMappingURL=bobrilDepsHelpers.js.map