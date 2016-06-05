import * as ts from "typescript";
import * as imgCache from "./imgCache";
import * as BuildHelpers from './buildHelpers';
import * as sourceMap from './sourceMap';
import { CompilationResultMessage } from './defs';
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
    reactNative?: boolean;
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
    constantOverrides?: {
        [module: string]: {
            [exportName: string]: string | number | boolean;
        };
    };
    specGlob?: string;
    mainJsFile?: string;
    noBobrilJsx?: boolean;
    localize?: boolean;
    fastBundle?: boolean;
    totalBundle?: boolean;
    compress?: boolean;
    mangle?: boolean;
    beautify?: boolean;
    defines?: {
        [name: string]: any;
    };
    outputDir?: string;
    outputSubDir?: string;
    projectJsonTime?: number;
    mainAutoDetected?: boolean;
    lastwrittenIndexHtml?: string;
    imgBundleCache?: imgCache.ImgBundleCache;
    depJsFiles?: {
        [name: string]: string;
    };
    moduleMap?: {
        [name: string]: {
            defFile: string;
            jsFile: string;
            isDefOnly: boolean;
            internalModule: boolean;
        };
    };
    commonJsTemp?: {
        [name: string]: Buffer;
    };
    depAssetFiles?: {
        [name: string]: string;
    };
    sourceMapMap?: {
        [namewoext: string]: sourceMap.SourceMap;
    };
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
export declare class CompilationResult {
    errors: number;
    warnings: number;
    messages: CompilationResultMessage[];
    constructor();
    clearFileName(fn: string): void;
    addMessage(isError: boolean, fn: string, text: string, pos: [number, number, number, number]): void;
}
export declare class CompilationCache {
    constructor();
    resolvePathStringLiteral: (nn: ts.StringLiteral) => string;
    cacheFiles: {
        [name: string]: ICacheFile;
    };
    defaultLibFilename: string;
    defLibPrecompiled: ts.SourceFile;
    imageCache: imgCache.ImgCache;
    logCallback: (text: string) => void;
    compilationResult: CompilationResult;
    reportDiagnostic(diagnostic: ts.Diagnostic, logcb: (text: string) => void): void;
    reportDiagnostics(diagnostics: ts.Diagnostic[], logcb: (text: string) => void): void;
    clearFileTimeModifications(): void;
    forceRebuildNextCompile(project?: IProject): void;
    overrides: {
        [fn: string]: {
            varDecl: ts.VariableDeclaration;
            value: string | number | boolean;
        }[];
    };
    addOverride(fn: string, varDecl: ts.VariableDeclaration, value: string | number | boolean): void;
    findVarDecl(project: IProject, program: ts.Program, exports: ts.Symbol[], expName: string): ts.VariableDeclaration;
    prepareToApplyConstantOverride(project: IProject, program: ts.Program): void;
    getResult(): CompilationResult;
    compile(project: IProject): Promise<any>;
    copyToProjectIfChanged(name: string, dir: string, outName: string, write: (filename: string, content: Buffer) => void): void;
    private addDepJsToOutput(project, srcDir, name);
    private clearMaxTimeForDeps();
    private getCachedFileExistence(fileName, baseDir);
    private updateCachedFileContent(cached);
    private updateCachedFileBuffer(cached);
    private getCachedFileContent(fileName, baseDir);
    private getCachedFileBuffer(fileName, baseDir);
    private calcMaxTimeForDeps(name, baseDir, ignoreOutputTime);
    private createCompilerHost(cc, project, writeFileCallback);
}
