import * as ts from "typescript";
import * as fs from "fs";
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as evalNode from "./evalNode";
import * as spriter from "./spriter";
import * as imageOps from "./imageOps";
import * as imgCache from "./imgCache";
require('bluebird');
import * as BuildHelpers from './buildHelpers';
import * as bobrilDepsHelpers from '../src/bobrilDepsHelpers';
import * as pathUtils from './pathUtils';

function reportDiagnostic(diagnostic, logcb: (text: string) => void) {
    var output = '';
    if (diagnostic.file) {
        var loc = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        output += `${diagnostic.file.fileName}(${loc.line + 1},${loc.character + 1}): `;
    }
    var category = ts.DiagnosticCategory[diagnostic.category].toLowerCase();
    output += `${category} TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ts.sys.newLine) }${ts.sys.newLine}`;
    logcb(output);
}

function reportDiagnostics(diagnostics, logcb: (text: string) => void) {
    for (var i = 0; i < diagnostics.length; i++) {
        reportDiagnostic(diagnostics[i], logcb);
    }
}

interface ICacheFile {
    fullName: string;
    text?: string;
    textTime?: number;
    sourceFile?: ts.SourceFile;
    sourceTime?: number;
    info?: BuildHelpers.SourceInfo;
    infoTime?: number;
    curTime?: number;
    maxTimeForDeps?: number;
    outputTime?: number;
}

interface IResFile {
    fullName: string;
    lastTime?: number;
    curTime?: number;
}

export interface IProject {
    main: string | string[];
    dir: string;
    options: ts.CompilerOptions;
    logCallback?: (text: string) => void;
    writeFileCallback?: (filename: string, content: Buffer) => void;
    debugStyleDefs?: boolean;
    releaseStyleDefs?: boolean;
    spriteMerge?: boolean;
    remapImages?: (filename: string) => string;
    textForTranslationReporter?: (message: BuildHelpers.TranslationMessage) => void;
    textForTranslationReplacer?: (message: BuildHelpers.TranslationMessage) => number;

    imgBundleCache?: imgCache.ImgBundleCache;
    depJsFiles?: { [name: string]: string };
    moduleMap?: { [name: string]: { defFile: string, jsFile: string, isDefOnly: boolean, internalModule: boolean } };
}

export class CompilationCache {
    constructor(resolvePathStringLiteral?: (sl: ts.StringLiteral) => string) {
        this.resolvePathStringLiteral = resolvePathStringLiteral || ((nn: ts.StringLiteral) => path.join(path.dirname(nn.getSourceFile().fileName), nn.text));
        this.defaultLibFilename = path.join(path.dirname(require.resolve('typescript').replace(/\\/g, '/')), 'lib.es6.d.ts');
        this.cacheFiles = Object.create(null);
        this.imageCache = new imgCache.ImgCache();
    }

    resolvePathStringLiteral: (sl: ts.StringLiteral) => string;
    cacheFiles: { [name: string]: ICacheFile };
    defaultLibFilename: string;
    defLibPrecompiled: ts.SourceFile;
    imageCache: imgCache.ImgCache;
    logCallback: (text: string) => void;

    clearFileTimeModifications() {
        let cacheFiles = this.cacheFiles;
        let names = Object.keys(cacheFiles);
        for (let i = 0; i < names.length; i++) {
            cacheFiles[names[i]].curTime = undefined;
        }
    }

    forceRebuildNextCompile(project?: IProject) {
        if (project) {
            project.moduleMap = null;
            project.depJsFiles = null;
        }
        let cacheFiles = this.cacheFiles;
        let names = Object.keys(cacheFiles);
        for (let i = 0; i < names.length; i++) {
            cacheFiles[names[i]].infoTime = undefined;
            cacheFiles[names[i]].outputTime = undefined;
        }
    }

    compile(project: IProject): Promise<any> {
        let mainList = Array.isArray(project.main) ? project.main : [<string>project.main];
        project.logCallback = project.logCallback || ((text: string) => console.log(text));
        this.logCallback = project.logCallback;
        project.writeFileCallback = project.writeFileCallback || ((filename: string, content: Buffer) => fs.writeFileSync(filename, content));
        project.moduleMap = project.moduleMap || Object.create(null);
        project.depJsFiles = project.depJsFiles || Object.create(null);
        this.clearMaxTimeForDeps();
        let mainChangedList = [];
        for (let i = 0; i < mainList.length; i++) {
            let main = mainList[i];
            let mainCache = this.calcMaxTimeForDeps(main, project.dir);
            if (mainCache.maxTimeForDeps !== undefined || project.spriteMerge || project.textForTranslationReplacer != null) {
                mainChangedList.push(main);
            }
        }
        if (mainChangedList.length === 0) {
            return Promise.resolve(null);
        }
        let program = ts.createProgram(mainChangedList, project.options, this.createCompilerHost(this, project, project.writeFileCallback));
        let diagnostics = program.getSyntacticDiagnostics();
        reportDiagnostics(diagnostics, project.logCallback);
        if (diagnostics.length === 0) {
            let diagnostics = program.getGlobalDiagnostics();
            reportDiagnostics(diagnostics, project.logCallback);
            if (diagnostics.length === 0) {
                let diagnostics = program.getSemanticDiagnostics();
                reportDiagnostics(diagnostics, project.logCallback);
            }
        }

        var bundleCache: imgCache.ImgBundleCache = null;
        if (project.spriteMerge) {
            if (project.imgBundleCache) {
                bundleCache = project.imgBundleCache;
            } else {
                bundleCache = new imgCache.ImgBundleCache(this.imageCache);
                project.imgBundleCache = bundleCache;
            }
            bundleCache.clear(false);
        }

        let tc = program.getTypeChecker();
        let sourceFiles = program.getSourceFiles();
        for (let i = 0; i < sourceFiles.length; i++) {
            let src = sourceFiles[i];
            if (src.hasNoDefaultLib) continue; // skip searching default lib
            let cached = this.getCachedFileExistence(src.fileName, project.dir);
            if (cached.sourceTime !== cached.infoTime) {
                cached.info = BuildHelpers.gatherSourceInfo(src, tc, this.resolvePathStringLiteral);
                cached.infoTime = cached.sourceTime;
                cached.maxTimeForDeps = undefined; // invalidate to recalculate fresness of dependencies
                this.calcMaxTimeForDeps(src.fileName, project.dir);
            }
            if (project.spriteMerge) {
                let info = cached.info;
                for (let j = 0; j < info.sprites.length; j++) {
                    let si = info.sprites[j];
                    if (si.name == null)
                        continue;
                    bundleCache.add(project.remapImages ? project.remapImages(si.name) : path.join(project.dir, si.name), si.color, si.width, si.height, si.x, si.y);
                }
            }
            if (project.textForTranslationReporter) {
                let trs = cached.info.trs;
                for (let j = 0; j < trs.length; j++) {
                    let message = trs[j].message;
                    if (typeof message === 'string')
                        project.textForTranslationReporter(trs[j]);
                }
            }
        }

        let prom = Promise.resolve(null);
        if (project.spriteMerge) {
            if (bundleCache.wasChange()) {
                prom = prom.then(() => bundleCache.build());
                prom = prom.then((bi: imageOps.Image) => {
                    return imageOps.savePNG2Buffer(bi);
                });
                prom = prom.then((b: Buffer) => {
                    project.writeFileCallback('bundle.png', b);
                    return null;
                });
            }
        }

        prom = prom.then(() => {
            for (let i = 0; i < sourceFiles.length; i++) {
                let src = sourceFiles[i];
                if (src.hasNoDefaultLib) continue; // skip searching default lib
                let cached = this.getCachedFileExistence(src.fileName, project.dir);
                if (cached.maxTimeForDeps !== null && cached.outputTime != null && cached.maxTimeForDeps <= cached.outputTime
                    && !project.spriteMerge && project.textForTranslationReplacer == null) {
                    continue;
                }
                if (/\/bobril-g11n\/index.ts$/.test(src.fileName)) {
                    this.addDepJsToOutput(project, bobrilDepsHelpers.numeralJsPath(), bobrilDepsHelpers.numeralJsFiles()[0]);
                    this.addDepJsToOutput(project, bobrilDepsHelpers.momentJsPath(), bobrilDepsHelpers.momentJsFiles()[0]);
                }
                let restorationMemory = <(() => void)[]>[];
                let info = cached.info;
                if (project.remapImages && !project.spriteMerge) {
                    for (let j = 0; j < info.sprites.length; j++) {
                        let si = info.sprites[j];
                        if (si.name == null)
                            continue;
                        let newname = project.remapImages(si.name);
                        if (newname != si.name) {
                            restorationMemory.push(BuildHelpers.rememberCallExpression(si.callExpression));
                            BuildHelpers.setArgument(si.callExpression, 0, newname);
                        }
                    }
                }
                if (project.spriteMerge) {
                    for (let j = 0; j < info.sprites.length; j++) {
                        let si = info.sprites[j];
                        if (si.name == null)
                            continue;
                        let bundlePos = bundleCache.query(project.remapImages ? project.remapImages(si.name) : path.join(project.dir, si.name), si.color, si.width, si.height, si.x, si.y);
                        restorationMemory.push(BuildHelpers.rememberCallExpression(si.callExpression));
                        BuildHelpers.setMethod(si.callExpression, "spriteb");
                        BuildHelpers.setArgument(si.callExpression, 0, bundlePos.width);
                        BuildHelpers.setArgument(si.callExpression, 1, bundlePos.height);
                        BuildHelpers.setArgument(si.callExpression, 2, bundlePos.x);
                        BuildHelpers.setArgument(si.callExpression, 3, bundlePos.y);
                        BuildHelpers.setArgumentCount(si.callExpression, 4);
                    }
                }
                if (project.textForTranslationReplacer) {
                    let trs = info.trs;
                    for (let j = 0; j < trs.length; j++) {
                        let message = trs[j].message;
                        if (typeof message === 'string') {
                            let id = project.textForTranslationReplacer(trs[j]);
                            let ce = trs[j].callExpression;
                            restorationMemory.push(BuildHelpers.rememberCallExpression(ce));
                            BuildHelpers.setArgument(ce, 0, id);
                            if (ce.arguments.length > 2) {
                                BuildHelpers.setArgumentCount(ce, 2);
                            }
                        }
                    }
                }
                for (let j = 0; j < info.styleDefs.length; j++) {
                    let sd = info.styleDefs[j];
                    if (project.debugStyleDefs) {
                        let name = sd.name;
                        if (sd.userNamed) continue;
                        if (!name)
                            continue;
                        restorationMemory.push(BuildHelpers.rememberCallExpression(sd.callExpression));
                        BuildHelpers.setArgumentCount(sd.callExpression, 3 + (sd.isEx ? 1 : 0));
                        BuildHelpers.setArgument(sd.callExpression, 2 + (sd.isEx ? 1 : 0), name);
                    } else if (project.releaseStyleDefs) {
                        if (sd.callExpression.arguments.length === 2 + (sd.isEx ? 1 : 0))
                            continue;
                        restorationMemory.push(BuildHelpers.rememberCallExpression(sd.callExpression));
                        BuildHelpers.setArgumentCount(sd.callExpression, 2 + (sd.isEx ? 1 : 0));
                    }
                }
                program.emit(src);
                for (let j = restorationMemory.length - 1; j >= 0; j--) {
                    restorationMemory[j]();
                }
                cached.outputTime = cached.maxTimeForDeps || cached.sourceTime;
            }
            let jsFiles = Object.keys(project.depJsFiles);
            for (let i = 0; i < jsFiles.length; i++) {
                let jsFile = jsFiles[i];
                let cached = this.getCachedFileExistence(jsFile, project.dir);
                if (cached.curTime == null) {
                    project.logCallback('Error: Dependent ' + jsFile + ' not found');
                    continue;
                }
                if (cached.outputTime == null || cached.curTime > cached.outputTime) {
                    this.updateCachedFileContent(cached);
                    if (cached.textTime !== cached.curTime) {
                        project.logCallback('Error: Dependent ' + jsFile + ' failed to load');
                        continue;
                    }
                    project.writeFileCallback(project.depJsFiles[jsFile], new Buffer(cached.text, 'utf-8'));
                }
            }
            if (project.spriteMerge) {
                bundleCache.clear(true);
            }
            return null;
        });
        return prom;
    }

    private addDepJsToOutput(project: IProject, srcDir: string, name: string) {
        project.depJsFiles[path.join(srcDir, name)] = name;
    }

    private clearMaxTimeForDeps() {
        let cacheFiles = this.cacheFiles;
        let names = Object.keys(cacheFiles);
        for (let i = 0; i < names.length; i++) {
            cacheFiles[names[i]].maxTimeForDeps = undefined;
        }
    }

    private getCachedFileExistence(fileName: string, baseDir: string): ICacheFile {
        let resolvedName: string = pathUtils.isAbsolutePath(fileName) ? fileName : path.join(baseDir, fileName);
        let resolvedNameLowerCased = resolvedName.toLowerCase();
        let cached = this.cacheFiles[resolvedNameLowerCased];
        if (cached === undefined) {
            cached = { fullName: resolvedName };
            this.cacheFiles[resolvedNameLowerCased] = cached;
        }
        if (cached.curTime == null) {
            if (cached.curTime === null) {
                return cached;
            }
            try {
                cached.curTime = fs.statSync(resolvedName).mtime.getTime();
            } catch (er) {
                cached.curTime = null;
                return cached;
            }
        }
        return cached;
    }

    private updateCachedFileContent(cached: ICacheFile) {
        if (cached.textTime !== cached.curTime) {
            let text: string;
            try {
                text = fs.readFileSync(cached.fullName).toString();
            } catch (er) {
                cached.textTime = null;
                return cached;
            }
            cached.textTime = cached.curTime;
            cached.text = text;
        }
    }

    private getCachedFileContent(fileName: string, baseDir: string): ICacheFile {
        let cached = this.getCachedFileExistence(fileName, baseDir);
        if (cached.curTime === null) {
            cached.textTime = null;
            return cached;
        }
        this.updateCachedFileContent(cached);
        return cached;
    }

    private calcMaxTimeForDeps(name: string, baseDir: string): ICacheFile {
        let cached = this.getCachedFileExistence(name, baseDir);
        if (cached.maxTimeForDeps !== undefined) // It was already calculated or is being calculated
            return cached;
        cached.maxTimeForDeps = cached.curTime;
        if (cached.curTime === null) // Does not exists, that's bad full rebuild will be needed
            return cached;
        if (cached.outputTime == null) // Output does not exists or is in unknown freshness
        {
            cached.maxTimeForDeps = null;
            return cached;
        }
        if (cached.curTime === cached.infoTime) { // If info is fresh
            let deps = cached.info.sourceDeps;
            for (let i = 0; i < deps.length; i++) {
                let depCached = this.calcMaxTimeForDeps(deps[i][1], baseDir);
                if (depCached.maxTimeForDeps === null) { // dependency does not exist -> rebuild to show error
                    cached.maxTimeForDeps = null;
                    return cached;
                }
                if (depCached.maxTimeForDeps > cached.maxTimeForDeps) {
                    cached.maxTimeForDeps = depCached.maxTimeForDeps;
                }
            }
        }
        return cached;
    }

    private createCompilerHost(cc: CompilationCache, project: IProject, writeFileCallback: (filename: string, content: Buffer) => void): ts.CompilerHost {
        let currentDirectory = project.dir;
        let logCallback = project.logCallback;

        function getCanonicalFileName(fileName: string): string {
            return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
        }

        function getCachedFileExistence(fileName: string): ICacheFile {
            return cc.getCachedFileExistence(fileName, currentDirectory);
        }

        function getCachedFileContent(fileName: string): ICacheFile {
            return cc.getCachedFileContent(fileName, currentDirectory);
        }

        function getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile {
            let isDefLib = fileName === cc.defaultLibFilename;
            if (isDefLib) {
                if (cc.defLibPrecompiled) return cc.defLibPrecompiled;
                let text: string;
                try {
                    text = fs.readFileSync(cc.defaultLibFilename).toString();
                } catch (er) {
                    if (onError) onError('Openning ' + cc.defaultLibFilename + " failed with " + er);
                    return null;
                }
                cc.defLibPrecompiled = ts.createSourceFile(fileName, text, languageVersion, true);
                return cc.defLibPrecompiled;
            }
            let cached = getCachedFileContent(fileName);
            if (cached.textTime == null) {
                return null;
            }
            if (cached.sourceTime !== cached.textTime) {
                cached.sourceFile = ts.createSourceFile(fileName, cached.text, languageVersion, true);
                cached.sourceTime = cached.textTime;
            }
            return cached.sourceFile;
        }

        function writeFile(fileName, data, writeByteOrderMark, onError) {
            try {
                writeFileCallback(fileName, new Buffer(data));
            } catch (e) {
                if (onError) {
                    onError(e.message);
                }
            }
        }

        function resolveModuleExtension(moduleName: string, nameWithoutExtension: string, internalModule: boolean): string {
            let cached = getCachedFileExistence(nameWithoutExtension + '.ts');
            if (cached.curTime !== null) {
                project.moduleMap[moduleName] = { defFile: nameWithoutExtension + '.ts', jsFile: nameWithoutExtension + '.js', isDefOnly: false, internalModule };
                return nameWithoutExtension + '.ts';
            }
            cached = getCachedFileExistence(nameWithoutExtension + '.d.ts');
            if (cached.curTime !== null) {
                cached = getCachedFileExistence(nameWithoutExtension + '.js');
                if (cached.curTime !== null) {
                    cc.addDepJsToOutput(project, '.', nameWithoutExtension + '.js');
                    project.moduleMap[moduleName] = { defFile: nameWithoutExtension + '.d.ts', jsFile: nameWithoutExtension + '.js', isDefOnly: true, internalModule };
                    return nameWithoutExtension + '.d.ts';
                }
            }
            return null;
        }

        function resolveModuleName(moduleName: string, containingFile: string): ts.ResolvedModule {
            if (moduleName.substr(0, 1) === '.') {
                let res = resolveModuleExtension(path.join(path.dirname(containingFile), moduleName), path.join(path.dirname(containingFile), moduleName), true);
                if (res == null)
                    throw new Error('Module ' + moduleName + ' is not valid in ' + containingFile);
                return { resolvedFileName: res };
            }
            // support for deprecated import * as b from 'node_modules/bobril/index';
            let curDir = path.dirname(containingFile);
            do {
                let res = resolveModuleExtension(moduleName, path.join(curDir, moduleName), false);
                if (res != null) {
                    if (!/^node_modules\//i.test(moduleName)) {
                        logCallback(`Wrong import '${moduleName}' in ${containingFile}. You must use relative path.`)
                    }
                    return { resolvedFileName: res };
                }
                let previousDir = curDir;
                curDir = path.dirname(curDir);
                if (previousDir === curDir)
                    break;
            } while (true);
            // only flat node_modules currently supported
            let pkgname = "node_modules/" + moduleName + "/package.json";
            let cached = getCachedFileContent(pkgname);
            if (cached.textTime == null) {
                throw new Error('Cannot resolve ' + moduleName + ' in ' + containingFile + '. ' + pkgname + ' not found');
            }
            let main: string;
            try {
                main = JSON.parse(cached.text).main;
            } catch (e) {
                throw new Error('Cannot parse ' + pkgname + ' ' + e);
            }
            let mainWithoutExt = main.replace(/\.[^/.]+$/, "");
            let res = resolveModuleExtension(moduleName, path.join("node_modules/" + moduleName, mainWithoutExt), false);
            if (res == null)
                throw new Error('Module ' + moduleName + ' is not valid in ' + containingFile);
            return { resolvedFileName: res };
        }

        return {
            getSourceFile: getSourceFile,
            getDefaultLibFileName: function(options) { return cc.defaultLibFilename; },
            writeFile: writeFile,
            getCurrentDirectory: function() { return currentDirectory; },
            useCaseSensitiveFileNames: function() { return ts.sys.useCaseSensitiveFileNames; },
            getCanonicalFileName: getCanonicalFileName,
            getNewLine: function() { return '\n'; },
            fileExists(fileName: string): boolean {
                if (fileName === cc.defaultLibFilename) return true;
                let cached = getCachedFileExistence(fileName);
                if (cached.curTime === null) return false;
                return true;
            },
            readFile(fileName: string): string {
                let cached = getCachedFileContent(fileName);
                if (cached.textTime == null) return null;
                return cached.text;
            },
            resolveModuleNames(moduleNames: string[], containingFile: string): ts.ResolvedModule[] {
                return moduleNames.map((n) => {
                    let r = resolveModuleName(n, containingFile);
                    //console.log(n, containingFile, r);
                    return r;
                });
            }
        };
    }
}
