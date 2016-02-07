import * as pathUtils from './pathUtils';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from 'fs';
import * as compilationCache from './compilationCache';
require('bluebird');
import { globalDefines } from './simpleHelpers';

export function systemJsPath(): string {
    return path.join(pathUtils.dirOfNodeModule('systemjs'), 'dist');
}

export function systemJsFiles(): string[] {
    return ['system.js', 'system-polyfills.js'];
}

export function loaderJsPath(): string {
    return __dirname.replace(/\\/g, "/");
}

export function loaderJsFiles(): string[] {
    return ["loader.js"];
}

export function numeralJsPath(): string {
    return pathUtils.dirOfNodeModule('numeral');
}

export function numeralJsFiles(): string[] {
    return ['numeral.js'];
}

export function momentJsPath(): string {
    return pathUtils.dirOfNodeModule('moment');
}

export function momentJsFiles(): string[] {
    return ['moment.js'];
}

function linkCss(project: compilationCache.IProject): string {
    return project.cssToLink.map(n => `<link rel="stylesheet" href="${n}">`).join("");
}

export function systemJsBasedIndexHtml(project: compilationCache.IProject) {
    let title = project.htmlTitle || 'Bobril Application';
    let moduleNames = Object.keys(project.moduleMap);
    let moduleMap = <{ [name: string]: string }>Object.create(null);
    for (let i = 0; i < moduleNames.length; i++) {
        let name = moduleNames[i];
        if (project.moduleMap[name].internalModule)
            continue;
        moduleMap[name] = project.moduleMap[name].jsFile;
    }
    return `<html>
    <head>
        <meta charset="utf-8">${project.htmlHeadExpanded}
        <title>${title}</title>${linkCss(project)}
    </head>
    <body>${g11nInit(project)}
        <script type="text/javascript" src="system.js" charset="utf-8"></script>
        <script type="text/javascript">
            ${globalDefines(project.defines)}
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

function g11nInit(project: compilationCache.IProject): string {
    if (!project.localize && !project.bundlePng)
        return "";
    let res = "<script>";
    if (project.localize) {
        res += `function g11nPath(s){return "./${project.outputSubDir ? (project.outputSubDir + "/") : ""}"+s+".js"};`
    }
    if (project.bundlePng) {
        res += `var bobrilBPath="${project.bundlePng}"`;
    }
    res += "</script>";
    return res;
}

export function bundleBasedIndexHtml(project: compilationCache.IProject) {
    let title = project.htmlTitle || 'Bobril Application';
    return `<html><head><meta charset="utf-8">${project.htmlHeadExpanded}<title>${title}</title>${linkCss(project)}</head><body>${g11nInit(project)}<script type="text/javascript" src="${ project.bundleJs || "bundle.js"}" charset="utf-8"></script></body></html>`;
}

export function fastBundleBasedIndexHtml(project: compilationCache.IProject) {
    let title = project.htmlTitle || 'Bobril Application';
    let moduleNames = Object.keys(project.moduleMap);
    let moduleMap = <{ [name: string]: string }>Object.create(null);
    for (let i = 0; i < moduleNames.length; i++) {
        let name = moduleNames[i];
        if (project.moduleMap[name].internalModule)
            continue;
        moduleMap[name] = project.moduleMap[name].jsFile.replace(/\.js$/i, "");
    }
    return `<html>
    <head>
        <meta charset="utf-8">${project.htmlHeadExpanded}
        <title>${title}</title>${linkCss(project)}
    </head>
    <body>${g11nInit(project)}
        <script type="text/javascript" src="loader.js" charset="utf-8"></script>
        <script type="text/javascript">
            ${globalDefines(project.defines)}
            R.map = ${JSON.stringify(moduleMap)}
        </script>
        <script type="text/javascript" src="${ project.bundleJs || "bundle.js"}" charset="utf-8"></script>
        <script type="text/javascript">
            R.r('${project.mainJsFile.replace(/\.js$/i, "")}');
        </script>
    </body>
</html>
`;
}

export function fastBundleBasedTestHtml(project: compilationCache.IProject) {
    let title = 'Jasmine Test';
    let moduleNames = Object.keys(project.moduleMap);
    let moduleMap = <{ [name: string]: string }>Object.create(null);
    for (let i = 0; i < moduleNames.length; i++) {
        let name = moduleNames[i];
        if (project.moduleMap[name].internalModule)
            continue;
        moduleMap[name] = project.moduleMap[name].jsFile.replace(/\.js$/i, "");
    }
    let reqSpec = project.mainSpec.filter(v => !/\.d.ts$/i.test(v)).map(v => `R.r('${v.replace(/\.tsx?$/i, "")}');`).join(' ');
    return `<html>
    <head>
        <meta charset="utf-8">${project.htmlHeadExpanded}
        <title>${title}</title>${linkCss(project)}
    </head>
    <body>${g11nInit(project)}
        <script type="text/javascript" src="bb/special/jasmine-core.js" charset="utf-8"></script>
        <script type="text/javascript" src="bb/special/jasmine-boot.js" charset="utf-8"></script>
        <script type="text/javascript" src="bb/special/loader.js" charset="utf-8"></script>
        <script type="text/javascript">
            ${globalDefines(project.defines)}
            R.map = ${JSON.stringify(moduleMap)}
        </script>
        <script type="text/javascript" src="${ project.bundleJs || "bundle.js"}" charset="utf-8"></script>
        <script type="text/javascript">
            ${reqSpec}
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

export function updateIndexHtml(project: compilationCache.IProject) {
    let newIndexHtml: string;
    if (project.totalBundle) {
        newIndexHtml = bundleBasedIndexHtml(project);
    } else if (project.fastBundle) {
        newIndexHtml = fastBundleBasedIndexHtml(project);
    } else {
        newIndexHtml = systemJsBasedIndexHtml(project);
    }
    if (newIndexHtml !== project.lastwrittenIndexHtml) {
        project.writeFileCallback('index.html', new Buffer(newIndexHtml));
        project.lastwrittenIndexHtml = newIndexHtml;
    }
}

export function updateTestHtml(project: compilationCache.IProject) {
    let newIndexHtml: string;
    newIndexHtml = fastBundleBasedTestHtml(project);
    project.writeFileCallback('test.html', new Buffer(newIndexHtml));
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

function writeDirFromCompilationCache(cc: compilationCache.CompilationCache, write: (fn: string, b: Buffer) => void, dir: string, files: string[]) {
    for (let i = 0; i < files.length; i++) {
        let f = files[i];
        cc.copyToProjectIfChanged(f, dir, f, write);
    }
}

export function updateSystemJsByCC(cc: compilationCache.CompilationCache, write: (fn: string, b: Buffer) => void) {
    writeDirFromCompilationCache(cc, write, systemJsPath(), systemJsFiles());
}

export function updateLoaderJsByCC(cc: compilationCache.CompilationCache, write: (fn: string, b: Buffer) => void) {
    writeDirFromCompilationCache(cc, write, loaderJsPath(), loaderJsFiles());
}
