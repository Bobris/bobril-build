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
import * as bobrilDepsHelpers from './bobrilDepsHelpers';
import * as pathUtils from './pathUtils';
import * as bundler from './bundler';
import * as sourceMap from './sourceMap';
import { DynamicBuffer } from './dynamicBuffer';
import * as simpleHelpers from './simpleHelpers';
import * as cssHelpers from './cssHelpers';
import { createFileNameShortener } from './shortenFileName';
import {AdditionalResources}  from './AdditionalResources'

function isCssByExt(name: string): boolean {
    return /\.css$/ig.test(name);
}

function isJsByExt(name: string): boolean {
    return /\.js$/ig.test(name);
}

export interface ICacheFile {
    fullName: string;
    text?: string;
    textTime?: number;
    buffer?: Buffer;
    bufferTime?: number;
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

export interface ICompilationTranslation {
    startCompileFile(fn: string): void;
    addUsageOfMessage(info: BuildHelpers.TranslationMessage): number;
    finishCompileFile(fn: string): void;
}

export interface IProject {
    main: string | string[];
    mainIndex?: string;
    mainExamples: string[];
    mainSpec?: string[];
    dir: string;
    options: ts.CompilerOptions;
    logCallback?: (text: string) => void;
    writeFileCallback?: (filename: string, content: Buffer) => void;
    debugStyleDefs?: boolean;
    releaseStyleDefs?: boolean;
    liveReloadStyleDefs?: boolean;
    spriteMerge?: boolean;
    resourcesAreRelativeToProjectDir?: boolean;
    resolvePathString?: (projectDir: string, sourcePath: string, text: string) => string;
    textForTranslationReporter?: (message: BuildHelpers.TranslationMessage, compilationResult: CompilationResult) => void;
    compileTranslation?: ICompilationTranslation;
    htmlTitle?: string;
    htmlHead?: string;
    constantOverrides?: { [module: string]: { [exportName: string]: string | number | boolean } };
    specGlob?: string;
    mainJsFile?: string;
    // forbid support JSX - it will be slightly faster
    noBobrilJsx?: boolean;
    // default false
    localize?: boolean;
    // default false
    fastBundle?: boolean;
    // default false, applied to concatenate all css too
    totalBundle?: boolean;
    // default true, applies to css too
    compress?: boolean;
    // default true
    mangle?: boolean;
    // default false
    beautify?: boolean;
    defines?: { [name: string]: any };
    outputDir?: string;
    outputSubDir?: string;

    projectJsonTime?: number;
    mainAutoDetected?: boolean;
    lastwrittenIndexHtml?: string;
    imgBundleCache?: imgCache.ImgBundleCache;
    depJsFiles?: { [name: string]: string };
    moduleMap?: { [name: string]: { defFile: string, jsFile: string, isDefOnly: boolean, internalModule: boolean } };
    commonJsTemp?: { [name: string]: Buffer };
    depAssetFiles?: { [name: string]: string };
    sourceMapMap?: { [namewoext: string]: sourceMap.SourceMap };
    htmlHeadExpanded?: string;
    cssToLink?: string[];
    bundleJs?: string;
    bundlePng?: string;
    realRootRel?: string;
    dependencies?: string[];
    devDependencies?: string[];
    npmRegistry?: string;
    additionalResourcesDirectory?: string;
}

export interface CompilationResultMessage {
    fileName: string;
    isError: boolean;
    text: string;
    /// startLine, startCol, endLine, endCol all one based
    pos: [number, number, number, number];
}

export class CompilationResult {
    errors: number;
    warnings: number;
    messages: CompilationResultMessage[];

    constructor() {
        this.errors = 0;
        this.warnings = 0;
        this.messages = [];
    }

    clearFileName(fn: string) {
        for (let i = 0; i < this.messages.length; i++) {
            let m = this.messages[i];
            if (m.fileName === fn) {
                if (m.isError) this.errors--; else this.warnings--;
                this.messages.splice(i, 1);
                i--;
            }
        }
    }

    addMessage(isError: boolean, fn: string, text: string, pos: [number, number, number, number]) {
        if (isError) this.errors++; else this.warnings++;
        this.messages.push({ fileName: fn, isError, text, pos });
    }
}

export class CompilationCache {
    constructor() {
        this.defaultLibFilename = path.join(path.dirname(require.resolve('typescript').replace(/\\/g, '/')), 'lib.es6.d.ts');
        this.cacheFiles = Object.create(null);
        this.imageCache = new imgCache.ImgCache();
        this.compilationResult = new CompilationResult();
    }

    resolvePathStringLiteral: (nn: ts.StringLiteral) => string;
    cacheFiles: { [name: string]: ICacheFile };
    defaultLibFilename: string;
    defLibPrecompiled: ts.SourceFile;
    imageCache: imgCache.ImgCache;
    logCallback: (text: string) => void;
    compilationResult: CompilationResult;

    reportDiagnostic(diagnostic: ts.Diagnostic, logcb: (text: string) => void) {
        var output = '';
        let text = `TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
        if (diagnostic.file) {
            var locStart = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            var locEnd = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start + diagnostic.length);
            output += `${diagnostic.file.fileName}(${locStart.line + 1},${locStart.character + 1}): `;
            this.compilationResult.addMessage(diagnostic.category === ts.DiagnosticCategory.Error,
                diagnostic.file.fileName, text, [locStart.line + 1, locStart.character + 1, locEnd.line + 1, locEnd.character + 1]);
        }
        var category = ts.DiagnosticCategory[diagnostic.category].toLowerCase();
        output += `${category} ${text}${ts.sys.newLine}`;
        logcb(output);
    }

    reportDiagnostics(diagnostics: ts.Diagnostic[], logcb: (text: string) => void) {
        for (var i = 0; i < diagnostics.length; i++) {
            this.reportDiagnostic(diagnostics[i], logcb);
        }
    }

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
            project.depAssetFiles = null;
        }
        let cacheFiles = this.cacheFiles;
        let names = Object.keys(cacheFiles);
        for (let i = 0; i < names.length; i++) {
            cacheFiles[names[i]].infoTime = undefined;
            cacheFiles[names[i]].outputTime = undefined;
        }
    }

    overrides: { [fn: string]: { varDecl: ts.VariableDeclaration, value: string | number | boolean }[] }

    addOverride(fn: string, varDecl: ts.VariableDeclaration, value: string | number | boolean) {
        let o = this.overrides[fn];
        if (o == null) {
            o = [];
            this.overrides[fn] = o;
        }
        o.push({ varDecl, value });
    }

    findVarDecl(project: IProject, program: ts.Program, exports: ts.Symbol[], expName: string): ts.VariableDeclaration {
        let tc = program.getTypeChecker();
        let symb = exports.find(v => v.name == expName);
        if (symb == null) {
            project.logCallback(`Cannot find export ${expName} in ${exports.map(v => v.name).join(',')}`);
            return null;
        }
        let decls = symb.getDeclarations();
        if (decls.length != 1) {
            project.logCallback(`Not unique declaration of ${expName}`);
            return null;
        }
        let decl = decls[0];
        if (decl.kind === ts.SyntaxKind.ExportSpecifier) {
            let exports2 = tc.getExportsOfModule(tc.getSymbolAtLocation((decl.parent.parent as ts.ExportDeclaration).moduleSpecifier));
            let expName2 = (decl as ts.ExportSpecifier).propertyName.text;
            return this.findVarDecl(project, program, exports2, expName2);
        }
        if (decl.kind === ts.SyntaxKind.VariableDeclaration) {
            return decl as ts.VariableDeclaration;
        }
        project.logCallback(`Don't know how to override ${expName} in ${(<any>ts).SyntaxKind[decl.kind]}`);
        return null;
    }

    prepareToApplyConstantOverride(project: IProject, program: ts.Program) {
        let overrides = project.constantOverrides;
        let moduleList = Object.keys(overrides);
        let tc = program.getTypeChecker();
        for (let i = 0; i < moduleList.length; i++) {
            let moduleName = moduleList[i];
            let moduleInfo = project.moduleMap[moduleName];
            if (moduleInfo == null) {
                project.logCallback(`Defined module override not found (${moduleName})`);
                continue;
            }
            let exports = tc.getExportsOfModule((program.getSourceFile(moduleInfo.defFile) as any).symbol as ts.Symbol);
            let overridesModule = overrides[moduleName];
            let overridesNames = Object.keys(overridesModule);
            for (let j = 0; j < overridesNames.length; j++) {
                let expName = overridesNames[j];
                let decl = this.findVarDecl(project, program, exports, expName);
                if (decl) {
                    this.addOverride(decl.getSourceFile().fileName, decl, overridesModule[expName]);
                }
            }
        }
    }

    getResult(): CompilationResult {
        return this.compilationResult;
    }

    compile(project: IProject): Promise<any> {
        let mainList = <string[]>(Array.isArray(project.main) ? project.main : [<string>project.main]);
        mainList = mainList.map(p => path.normalize(p));
        project.logCallback = project.logCallback || ((text: string) => console.log(text));
        this.logCallback = project.logCallback;
        project.writeFileCallback = project.writeFileCallback || ((filename: string, content: Buffer) => fs.writeFileSync(filename, content));
        let jsWriteFileCallback = project.writeFileCallback;

        let ndir = project.dir.toLowerCase() + "/";
        function relativizeToProject(p: string): string {
            let nfn = p.toLowerCase();
            if (nfn.substr(0, ndir.length) === ndir) {
                p = p.substr(ndir.length);
            }
            return p;
        }

        let resolvePathString = project.resolvePathString || project.resourcesAreRelativeToProjectDir ?
            (p, s, t) => relativizeToProject(pathUtils.join(p, t)) : (p, s, t) => relativizeToProject(/^node_modules\//.test(t) ? pathUtils.join(p, t) : pathUtils.join(path.dirname(s), t));
        this.resolvePathStringLiteral = ((nn: ts.StringLiteral) => resolvePathString(project.dir, nn.getSourceFile().fileName, nn.text));
        if (project.totalBundle) {
            project.options.sourceMap = false;
            project.options.removeComments = false;
        } else if (project.fastBundle) {
            project.options.sourceMap = true;
        }
        if (!project.noBobrilJsx) {
            project.options.jsx = ts.JsxEmit.React;
            project.options.reactNamespace = "b";
        }
        project.options.allowJs = true;
        // workaround for TypeScript does not want to overwrite JS files.
        project.options.outDir = "virtual/";
        project.options.rootDir = project.dir;
        if (project.totalBundle || project.fastBundle) {
            project.options.module = ts.ModuleKind.CommonJS;
            project.commonJsTemp = project.commonJsTemp || Object.create(null);
            project.sourceMapMap = project.sourceMapMap || Object.create(null);
            jsWriteFileCallback = (filename: string, content: Buffer) => {
                if (/\.js\.map$/i.test(filename)) {
                    let sm = sourceMap.parseSourceMap(content);
                    project.sourceMapMap[filename.replace(/\.js\.map$/i, "").toLowerCase()] = sm;
                } else if (/\.js$/i.test(filename)) {
                    content = simpleHelpers.removeLinkToSourceMap(content);
                    project.commonJsTemp[filename.toLowerCase()] = content;
                } else {
                    project.commonJsTemp[filename.toLowerCase()] = content;
                }
            };
            project.bundleJs = "bundle.js";
        }
        let shortenFileName = (fn: string) => fn;
        let shortenFileNameAddPath = shortenFileName;
        if (project.totalBundle) {
            shortenFileName = createFileNameShortener();
            shortenFileNameAddPath = shortenFileName;
            if (project.outputSubDir) {
                shortenFileNameAddPath = (fn: string) => project.outputSubDir + "/" + shortenFileName(fn);
            }
            project.bundleJs = shortenFileNameAddPath(project.bundleJs);
        }
        if (project.spriteMerge) { // reserve always same name for bundle.png
            shortenFileName('bundle.png');
        }
        let jsWriteFileCallbackUnnormalized = jsWriteFileCallback;
        jsWriteFileCallback = (filename: string, content: Buffer) => {
            jsWriteFileCallbackUnnormalized(relativizeToProject(filename), content);
        };
        project.moduleMap = project.moduleMap || Object.create(null);
        project.depJsFiles = project.depJsFiles || Object.create(null);
        project.depAssetFiles = project.depAssetFiles || Object.create(null);
        project.cssToLink = project.cssToLink || [];
        this.clearMaxTimeForDeps();
        let mainChangedList = [];
        for (let i = 0; i < mainList.length; i++) {
            let main = mainList[i];
            let mainCache = this.calcMaxTimeForDeps(main, project.dir, false);
            if (mainCache.maxTimeForDeps !== undefined || project.spriteMerge) {
                mainChangedList.push(main);
            }
        }
        if (mainChangedList.length === 0) {
            return Promise.resolve(null);
        }

        let program = ts.createProgram(mainChangedList, project.options, this.createCompilerHost(this, project, jsWriteFileCallback));
        let diagnostics = program.getSyntacticDiagnostics();
        let sourceFiles = program.getSourceFiles();
        for (let i = 0; i < sourceFiles.length; i++) {
            let src = sourceFiles[i];
            this.compilationResult.clearFileName(src.fileName);
        }
        this.reportDiagnostics(diagnostics, project.logCallback);
        if (diagnostics.length === 0) {
            let diagnostics = program.getGlobalDiagnostics();
            this.reportDiagnostics(diagnostics, project.logCallback);
            if (diagnostics.length === 0) {
                let diagnostics = program.getSemanticDiagnostics();
                this.reportDiagnostics(diagnostics, project.logCallback);
            }
        }

        let restorationMemory = <(() => void)[]>[];

        this.overrides = Object.create(null);
        if (project.constantOverrides) {
            this.prepareToApplyConstantOverride(project, program);
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
        for (let i = 0; i < sourceFiles.length; i++) {
            let src = sourceFiles[i];
            if (/\.d\.ts$/i.test(src.fileName)) continue; // skip searching default lib
            let overr = this.overrides[src.fileName];
            if (overr != null) {
                restorationMemory.push(BuildHelpers.applyOverrides(overr));
            }
            let cached = this.getCachedFileExistence(src.fileName, project.dir);
            if (cached.sourceTime !== cached.infoTime) {
                cached.info = BuildHelpers.gatherSourceInfo(src, tc, this.resolvePathStringLiteral);
                cached.infoTime = cached.sourceTime;
            }
            if (project.spriteMerge) {
                let info = cached.info;
                for (let j = 0; j < info.sprites.length; j++) {
                    let si = info.sprites[j];
                    if (si.name == null)
                        continue;
                    bundleCache.add(pathUtils.join(project.dir, si.name), si.color, si.width, si.height, si.x, si.y);
                }
            }
            if (project.textForTranslationReporter) {
                let trs = cached.info.trs;
                for (let j = 0; j < trs.length; j++) {
                    let message = trs[j].message;
                    if (typeof message === 'string')
                        project.textForTranslationReporter(trs[j], this.compilationResult);
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
                    project.bundlePng = shortenFileNameAddPath('bundle.png');
                    project.writeFileCallback(project.bundlePng, b);
                    return null;
                });
            }
        }

        project.htmlHeadExpanded = (project.htmlHead || "").replace(/<<[^>]+>>/g, (s) => {
            s = s.substr(2, s.length - 4);
            let shortened = shortenFileNameAddPath(s);
            project.depAssetFiles[s] = shortened;
            return shortened;
        });

        // Recalculate fresness of all files
        this.clearMaxTimeForDeps();
        for (let i = 0; i < sourceFiles.length; i++) {
            this.calcMaxTimeForDeps(sourceFiles[i].fileName, project.dir, true);
        }

        prom = prom.then(() => {
            project.realRootRel = path.relative((<any>program).getCommonSourceDirectory(), project.dir);
            if (project.realRootRel !== "") {
                project.realRootRel = project.realRootRel + "/";
            }
            for (let i = 0; i < sourceFiles.length; i++) {
                let src = sourceFiles[i];
                if (/\.d\.ts$/i.test(src.fileName)) continue; // skip searching default lib
                let overr = this.overrides[src.fileName];
                if (overr != null) {
                    BuildHelpers.applyOverridesHarder(overr);
                }
                let cached = this.getCachedFileExistence(src.fileName, project.dir);
                if (cached.maxTimeForDeps !== null && cached.outputTime != null && cached.maxTimeForDeps <= cached.outputTime
                    && !project.spriteMerge) {
                    continue;
                }
                if (/\/bobril-g11n\/index.ts$/.test(src.fileName)) {
                    this.addDepJsToOutput(project, bobrilDepsHelpers.numeralJsPath(), bobrilDepsHelpers.numeralJsFiles()[0]);
                    this.addDepJsToOutput(project, bobrilDepsHelpers.momentJsPath(), bobrilDepsHelpers.momentJsFiles()[0]);
                }
                let info = cached.info;
                if (project.spriteMerge) {
                    for (let j = 0; j < info.sprites.length; j++) {
                        let si = info.sprites[j];
                        if (si.name == null)
                            continue;
                        let bundlePos = bundleCache.query(pathUtils.join(project.dir, si.name), si.color, si.width, si.height, si.x, si.y);
                        restorationMemory.push(BuildHelpers.rememberCallExpression(si.callExpression));
                        if (si.callExpression.arguments.length >= 2 && si.color === undefined) {
                            BuildHelpers.setMethod(si.callExpression, "spritebc");
                            BuildHelpers.setArgumentAst(si.callExpression, 0, si.callExpression.arguments[1]);
                            BuildHelpers.setArgument(si.callExpression, 1, bundlePos.width);
                            BuildHelpers.setArgument(si.callExpression, 2, bundlePos.height);
                            BuildHelpers.setArgument(si.callExpression, 3, bundlePos.x);
                            BuildHelpers.setArgument(si.callExpression, 4, bundlePos.y);
                            BuildHelpers.setArgumentCount(si.callExpression, 5);
                        } else {
                            BuildHelpers.setMethod(si.callExpression, "spriteb");
                            BuildHelpers.setArgument(si.callExpression, 0, bundlePos.width);
                            BuildHelpers.setArgument(si.callExpression, 1, bundlePos.height);
                            BuildHelpers.setArgument(si.callExpression, 2, bundlePos.x);
                            BuildHelpers.setArgument(si.callExpression, 3, bundlePos.y);
                            BuildHelpers.setArgumentCount(si.callExpression, 4);
                        }
                    }
                } else {
                    for (let j = 0; j < info.sprites.length; j++) {
                        let si = info.sprites[j];
                        if (si.name == null)
                            continue;
                        let newname = si.name;
                        project.depAssetFiles[si.name] = shortenFileNameAddPath(newname);
                        restorationMemory.push(BuildHelpers.rememberCallExpression(si.callExpression));
                        BuildHelpers.setArgument(si.callExpression, 0, newname);
                    }
                }
                for (let j = 0; j < info.assets.length; j++) {
                    let sa = info.assets[j];
                    if (sa.name == null) {
                        project.logCallback(info.sourceFile.fileName + ":" + (info.sourceFile.getLineAndCharacterOfPosition(sa.callExpression.pos).line + 1) + " Warning: Used b.asset without compile time constant - ignoring")
                        continue;
                    }
                    let newname = sa.name;
                    if (!isCssByExt(newname) && !isJsByExt(newname)) {
                        newname = shortenFileNameAddPath(newname);
                    }
                    project.depAssetFiles[sa.name] = newname;
                    restorationMemory.push(BuildHelpers.rememberCallExpression(sa.callExpression));
                    BuildHelpers.setArgument(sa.callExpression, 0, newname);
                }
                if (project.compileTranslation) {
                    project.compileTranslation.startCompileFile(src.fileName);
                    let trs = info.trs;
                    for (let j = 0; j < trs.length; j++) {
                        let message = trs[j].message;
                        if (typeof message === 'string' && trs[j].justFormat != true) {
                            let id = project.compileTranslation.addUsageOfMessage(trs[j]);
                            let ce = trs[j].callExpression;
                            restorationMemory.push(BuildHelpers.rememberCallExpression(ce));
                            BuildHelpers.setArgument(ce, 0, id);
                            if (ce.arguments.length > 2) {
                                BuildHelpers.setArgumentCount(ce, 2);
                            }
                        }
                    }
                    project.compileTranslation.finishCompileFile(src.fileName);
                }
                for (let j = 0; j < info.styleDefs.length; j++) {
                    let sd = info.styleDefs[j];
                    let remembered = false;
                    let skipEx = sd.isEx ? 1 : 0;
                    if (project.liveReloadStyleDefs) {
                        remembered = true;
                        restorationMemory.push(BuildHelpers.rememberCallExpression(sd.callExpression));
                        BuildHelpers.setArgumentAst(sd.callExpression, skipEx, BuildHelpers.buildLambdaReturningArray(sd.callExpression.arguments.slice(skipEx, 2 + skipEx)));
                        BuildHelpers.setArgument(sd.callExpression, 1 + skipEx, null);
                    }
                    if (project.debugStyleDefs) {
                        let name = sd.name;
                        if (sd.userNamed) continue;
                        if (!name)
                            continue;
                        if (!remembered) {
                            restorationMemory.push(BuildHelpers.rememberCallExpression(sd.callExpression));
                        }
                        BuildHelpers.setArgumentCount(sd.callExpression, 3 + skipEx);
                        BuildHelpers.setArgument(sd.callExpression, 2 + skipEx, name);
                    } else if (project.releaseStyleDefs) {
                        if (sd.callExpression.arguments.length <= 2 + skipEx)
                            continue;
                        if (!remembered) {
                            restorationMemory.push(BuildHelpers.rememberCallExpression(sd.callExpression));
                        }
                        BuildHelpers.setArgumentCount(sd.callExpression, 2 + skipEx);
                    }
                }
                program.emit(src);
                cached.outputTime = cached.maxTimeForDeps || cached.sourceTime;
                for (let j = restorationMemory.length - 1; j >= 0; j--) {
                    restorationMemory[j]();
                }
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
                    jsWriteFileCallback(project.depJsFiles[jsFile], new Buffer(cached.text, 'utf-8'));
                    cached.outputTime = cached.textTime;
                }
            }

            let prom = Promise.resolve();
            let assetFiles = Object.keys(project.depAssetFiles);
            let cssToMerge = [];
            for (let i = 0; i < assetFiles.length; i++) {
                prom = prom.then(v => ((i) => {
                    let assetFile = assetFiles[i];
                    let cached = this.getCachedFileExistence(assetFile, project.dir);
                    if (cached.curTime == null) {
                        project.logCallback('Error: Dependent ' + assetFile + ' not found');
                        return;
                    }
                    if (cached.outputTime == null || cached.curTime > cached.outputTime) {
                        this.updateCachedFileBuffer(cached);
                        if (cached.bufferTime !== cached.curTime) {
                            return;
                        }
                        if (isCssByExt(assetFile)) {
                            if (project.totalBundle) {
                                cssToMerge.push({ source: cached.buffer.toString(), from: assetFile });
                            } else {
                                project.cssToLink.push(project.depAssetFiles[assetFile]);
                                return cssHelpers.processCss(cached.buffer.toString(), assetFile, (url: string, from: string) => {
                                    let hi = url.lastIndexOf('#');
                                    let hi2 = url.lastIndexOf('?');
                                    if (hi < 0) hi = url.length;
                                    if (hi2 < 0) hi2 = url.length;
                                    if (hi2 < hi) hi = hi2;
                                    let res = resolvePathString(project.dir, from + "/a", url.substr(0, hi));
                                    project.depAssetFiles[res] = res;
                                    return url;
                                }).then(v => {
                                    project.writeFileCallback(project.depAssetFiles[assetFile], new Buffer(v.css));
                                }, (e) => {
                                    project.logCallback(e.toString());
                                });
                            }
                        }
                    }
                })(i));
            }
            prom = prom.then(() => {
                if (cssToMerge.length > 0) {
                    return cssHelpers.concatenateCssAndMinify(cssToMerge, (url: string, from: string) => {
                        let hi = url.lastIndexOf('#');
                        let hi2 = url.lastIndexOf('?');
                        if (hi < 0) hi = url.length;
                        if (hi2 < 0) hi2 = url.length;
                        if (hi2 < hi) hi = hi2;
                        let res = resolvePathString(project.dir, from + "/a", url.substr(0, hi));
                        let resres = shortenFileNameAddPath(res);
                        project.depAssetFiles[res] = resres;
                        return shortenFileName(res) + url.substr(hi);
                    }).then(v => {
                        let bundleCss = shortenFileNameAddPath('bundle.css');
                        project.cssToLink.push(bundleCss);
                        project.writeFileCallback(bundleCss, new Buffer(v.css));
                    });
                }
            });

            return prom.then(() => {
                let assetFiles = Object.keys(project.depAssetFiles);
                for (let i = 0; i < assetFiles.length; i++) {
                    let assetFile = assetFiles[i];
                    let cached = this.getCachedFileExistence(assetFile, project.dir);
                    if (cached.curTime == null) {
                        project.logCallback('Error: Dependent ' + assetFile + ' not found');
                        continue;
                    }
                    if (cached.outputTime == null || cached.curTime > cached.outputTime) {
                        this.updateCachedFileBuffer(cached);
                        if (cached.bufferTime !== cached.curTime) {
                            project.logCallback('Error: Dependent ' + assetFile + ' failed to load');
                            continue;
                        }
                        if (!isCssByExt(assetFile) && !isJsByExt(assetFile)) {
                            project.writeFileCallback(project.depAssetFiles[assetFile], cached.buffer);
                        }
                        cached.outputTime = cached.textTime;
                    }
                }

                if (project.totalBundle) {
                    let mainJsList = (<string[]>mainList).filter((nn) => !/\.d\.ts$/.test(nn)).map((nn) => nn.replace(/\.tsx?$/, '.js'));
                    let that = this;
                    let bp: bundler.IBundleProject = {
                        compress: project.compress,
                        mangle: project.mangle,
                        beautify: project.beautify,
                        defines: project.defines,
                        getMainFiles() {
                            return mainJsList;
                        },
                        checkFileModification(name: string): number {
                            if (/\.js$/i.test(name)) {
                                let cached = that.getCachedFileContent(name.replace(/\.js$/i, '.ts'), project.dir);
                                if (cached.curTime != null)
                                    return cached.outputTime;
                                cached = that.getCachedFileContent(name.replace(/\.js$/i, '.tsx'), project.dir);
                                if (cached.curTime != null)
                                    return cached.outputTime;
                            }
                            let cached = that.getCachedFileContent(name, project.dir);
                            return cached.curTime;
                        },
                        readContent(name: string) {
                            let jsout = project.commonJsTemp[name.toLowerCase()];
                            if (jsout !== undefined)
                                return jsout.toString('utf-8');
                            let cached = that.getCachedFileContent(name, project.dir);
                            if (cached.textTime == null) {
                                project.logCallback('Cannot read content of ' + name + ' in dir ' + project.dir);
                                return "";
                            }
                            return cached.text;
                        },
                        writeBundle(content: string) {
                            let res = new DynamicBuffer();
                            for (let i = 0; i < assetFiles.length; i++) {
                                let assetFile = assetFiles[i];
                                if (!isJsByExt(assetFile)) continue;
                                let cached = that.getCachedFileExistence(assetFile, project.dir);
                                if (cached.curTime == null || cached.bufferTime !== cached.curTime) {
                                    continue;
                                }
                                res.addBuffer(cached.buffer);
                                res.addByte(10);
                            }
                            res.addString(content);
                            project.writeFileCallback(project.bundleJs, res.toBuffer());
                        }
                    };
                    bundler.bundle(bp);
                } else if (project.fastBundle) {
                    let allFilesInJsBundle = Object.keys(project.commonJsTemp);
                    let res = new sourceMap.SourceMapBuilder();
                    for (let i = 0; i < assetFiles.length; i++) {
                        let assetFile = assetFiles[i];
                        if (!isJsByExt(assetFile)) continue;
                        let cached = this.getCachedFileExistence(assetFile, project.dir);
                        if (cached.curTime == null || cached.bufferTime !== cached.curTime) {
                            continue;
                        }
                        res.addSource(cached.buffer);
                    }
                    for (let i = 0; i < allFilesInJsBundle.length; i++) {
                        let name = allFilesInJsBundle[i];
                        let nameWOExt = name.replace(/\.js$/i, '');
                        let sm = project.sourceMapMap[nameWOExt];
                        let content = project.commonJsTemp[name];
                        res.addLine("R(\'" + nameWOExt + "\',function(require, module, exports){");
                        res.addSource(content, sm);
                        res.addLine("});");
                    }
                    res.addLine("//# sourceMappingURL=" + shortenFileName("bundle.js") + ".map");
                    project.writeFileCallback(project.bundleJs + '.map', res.toSourceMapBuffer(project.options.sourceRoot));
                    project.writeFileCallback(project.bundleJs, res.toContent());
                }

                if (project.spriteMerge) {
                    bundleCache.clear(true);
                }
                return null;
            })
        });
        return prom;
    }

    public copyToProjectIfChanged(name: string, dir: string, outName: string, write: (filename: string, content: Buffer) => void) {
        let cache = this.getCachedFileExistence(name, dir);
        if (cache.curTime == null) {
            this.logCallback('Cannot copy ' + name + ' from ' + dir + ' to ' + outName + ' because it does not exist');
            return;
        }
        if (cache.outputTime == null || cache.curTime > cache.outputTime) {
            let buf = fs.readFileSync(cache.fullName);
            write(outName, buf);
            cache.outputTime = cache.curTime;
        }
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

    private updateCachedFileBuffer(cached: ICacheFile) {
        if (cached.bufferTime !== cached.curTime) {
            let buffer: Buffer;
            try {
                buffer = fs.readFileSync(cached.fullName);
            } catch (er) {
                cached.bufferTime = null;
                return cached;
            }
            cached.bufferTime = cached.curTime;
            cached.buffer = buffer;
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

    private getCachedFileBuffer(fileName: string, baseDir: string): ICacheFile {
        let cached = this.getCachedFileExistence(fileName, baseDir);
        if (cached.curTime === null) {
            cached.bufferTime = null;
            return cached;
        }
        this.updateCachedFileBuffer(cached);
        return cached;
    }

    private calcMaxTimeForDeps(name: string, baseDir: string, ignoreOutputTime: boolean): ICacheFile {
        let cached = this.getCachedFileExistence(name, baseDir);
        if (cached.maxTimeForDeps !== undefined) // It was already calculated or is being calculated
            return cached;
        cached.maxTimeForDeps = cached.curTime;
        if (cached.curTime === null) // Does not exists, that's bad full rebuild will be needed
            return cached;
        if (!ignoreOutputTime && cached.outputTime == null) // Output does not exists or is in unknown freshness
        {
            cached.maxTimeForDeps = null;
            return cached;
        }
        if (cached.curTime === cached.infoTime) { // If info is fresh
            let deps = cached.info.sourceDeps;
            for (let i = 0; i < deps.length; i++) {
                let depCached = this.calcMaxTimeForDeps(deps[i][1], baseDir, ignoreOutputTime);
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
            return fileName.toLowerCase();
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
                fileName = fileName.replace(new RegExp("^" + project.options.outDir), "");
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
            cached = getCachedFileExistence(nameWithoutExtension + '.js');
            if (cached.curTime !== null) {
                project.moduleMap[moduleName] = { defFile: nameWithoutExtension + '.js', jsFile: nameWithoutExtension + '.js', isDefOnly: false, internalModule };
                return nameWithoutExtension + '.js';
            }
            return null;
        }

        function resolveModuleName(moduleName: string, containingFile: string): ts.ResolvedModule {
            if (moduleName.substr(0, 1) === '.') {
                let res = resolveModuleExtension(path.join(path.dirname(containingFile), moduleName), path.join(path.dirname(containingFile), moduleName), true);
                if (res == null) {
                    project.logCallback('Module ' + moduleName + ' is not valid in ' + containingFile);
                    return null;
                }
                return { resolvedFileName: res };
            }
            // support for deprecated import * as b from 'node_modules/bobril/index';
            let curDir = path.dirname(containingFile);
            do {
                let res = resolveModuleExtension(moduleName, path.join(curDir, moduleName), false);
                if (res != null) {
                    if (!/^node_modules\//i.test(moduleName)) {
                        //logCallback(`Wrong import '${moduleName}' in ${containingFile}. You must use relative path.`)
                    }
                    return { resolvedFileName: res };
                }
                let previousDir = curDir;
                curDir = path.dirname(curDir);
                if (previousDir === curDir)
                    break;
            } while (true);
            // only flat node_modules currently supported (means only npm 3+)
            let pkgname = "node_modules/" + moduleName + "/package.json";
            let cached = getCachedFileContent(pkgname);
            if (cached.textTime == null) {
                return null;
            }
            let main: string;
            try {
                main = JSON.parse(cached.text).main;
            } catch (e) {
                project.logCallback('Cannot parse ' + pkgname + ' ' + e);
                return null;
            }
            if (main == null) main = 'index.js';
            let mainWithoutExt = main.replace(/\.[^/.]+$/, "");
            let res = resolveModuleExtension(moduleName, path.join("node_modules/" + moduleName, mainWithoutExt), false);
            if (res == null) {
                project.logCallback('Module ' + moduleName + ' is not valid in ' + containingFile);
                return null;
            }
            return { resolvedFileName: res };
        }

        return {
            getSourceFile: getSourceFile,
            getDefaultLibFileName: function (options) { return cc.defaultLibFilename; },
            writeFile: writeFile,
            getCurrentDirectory: function () { return currentDirectory; },
            useCaseSensitiveFileNames: function () { return ts.sys.useCaseSensitiveFileNames; },
            getCanonicalFileName: getCanonicalFileName,
            getNewLine: function () { return '\n'; },
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
