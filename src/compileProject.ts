import * as bb from './index';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";
import * as ts from "typescript";
import * as g11n from "./msgFormatParser";
import * as glob from "glob";
import * as minimatch from "minimatch";
import { deepEqual } from './deepEqual';
import * as plugins from "./pluginsLoader";
import {AdditionalResources}  from './additionalResources'

export function createProjectFromDir(path: string): bb.IProject {
    let project: bb.IProject = {
        dir: path.replace(/\\/g, '/'),
        main: null,
        mainIndex: null,
        mainJsFile: null,
        noBobrilJsx: false,
        mainExamples: [],
        specGlob: "**/*@(.s|S)pec.ts?(x)",
        options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5, skipDefaultLibCheck: true }
    };
    return project;
}

function autodetectMainTs(project: bb.IProject): boolean {
    const searchMainTsList = ['index.ts', 'app.ts', 'lib.ts', 'src/index.ts', 'src/app.ts', 'src/lib.ts', 'app.tsx'];
    project.mainAutoDetected = true;
    for (let i = 0; i < searchMainTsList.length; i++) {
        let fn = searchMainTsList[i];
        if (fs.existsSync(path.join(project.dir, fn))) {
            project.mainIndex = fn;
            project.logCallback("Info: Main found " + fn);
            return true;
        }
    }
    project.logCallback('Error: Main not found. Searched: ' + searchMainTsList.join(', '));
    return false;
}

const bbDirRoot = path.dirname(__dirname.replace(/\\/g, "/"));

function runUpdateTsConfig(cwd: string, files: { [dir: string]: string[] }, jsx: boolean) {
    let tscfgPath = path.join(cwd, 'tsconfig.json');
    let tscfg: any = {};
    let origtscfg = {};
    if (fs.existsSync(tscfgPath)) {
        try {
            let content = fs.readFileSync(tscfgPath, 'utf8');
            tscfg = JSON.parse(content);
            origtscfg = JSON.parse(content);
        } catch (e) {
            console.log("Failed to read and parse " + tscfgPath, e);
        }
    }
    if (tscfg == null) {
        tscfg = {};
    }
    if (tscfg.compilerOptions == null) {
        tscfg.compilerOptions = {};
    }
    Object.assign(tscfg.compilerOptions, {
        target: "es6",
        module: "commonjs",
        moduleResolution: "node"
    });
    if (jsx) {
        Object.assign(tscfg.compilerOptions, {
            jsx: "react",
            reactNamespace: "b"
        });
    } else {
        if (tscfg.compilerOptions.reactNamespace === "b") {
            tscfg.compilerOptions.jsx = undefined;
            tscfg.compilerOptions.reactNamespace = undefined;
        }
    }
    tscfg.compileOnSave = false;
    let fileList = [];
    let dirs = Object.keys(files);
    for (let i = 0; i < dirs.length; i++) {
        let d = dirs[i];
        if (/^node_modules/ig.test(d))
            continue;
        let f = files[d];
        if (d === ".") {
            d = "";
        } else {
            d = d + '/';
        }
        for (let j = 0; j < f.length; j++)
            fileList.push(d + f[j]);
    }
    if (jsx) {
        fileList.push("node_modules/bobril/jsx.d.ts");
    }
    fileList.sort();
    tscfg.files = fileList;
    if (deepEqual(tscfg, origtscfg))
        return;
    try {
        fs.writeFileSync(tscfgPath, JSON.stringify(tscfg, null, 4));
    } catch (e) {
        console.log("Failed to read and parse " + tscfgPath, e);
    }
}

function autodetectMainExample(project: bb.IProject, allFiles: { [dir: string]: string[] }) {
    if (project.mainExamples.length == 0 && project.mainIndex === "index.ts") {
        if (fs.existsSync(path.join(project.dir, "example.ts"))) {
            project.mainExamples.push("example.ts");
        }
    }
    if (allFiles != null) {
        let re = minimatch.makeRe(project.specGlob);
        let specList = [];
        let dirs = Object.keys(allFiles);
        let containsJasmineDefFile = false;
        for (let i = 0; i < dirs.length; i++) {
            let d = dirs[i];
            if (d.indexOf('node_modules') != -1) continue;
            let f = allFiles[d];
            if (d === ".") {
                d = "";
            } else {
                d = d + '/';
            }
            for (let j = 0; j < f.length; j++) {
                let ff = d + f[j];
                if (f[j] == 'jasmine.d.ts') {
                    if (!containsJasmineDefFile) {
                        specList.push(ff);
                        containsJasmineDefFile = true;
                    }
                    continue;
                }
                if (re.test(ff))
                    specList.push(ff);
            }
        }
        if (specList.length > 0) {
            if (!containsJasmineDefFile) {
                allFiles[bbDirRoot + "/typings/jasmine"] = ["jasmine.d.ts"];
                specList.push(bbDirRoot + "/typings/jasmine/jasmine.d.ts");
            }
            project.mainSpec = specList;
        } else {
            project.mainSpec = null;
        }
        runUpdateTsConfig(project.dir, allFiles, !project.noBobrilJsx);
    }
    if (project.mainExamples.length > 0) {
        if (project.mainExamples.length == 1) {
            project.main = [project.mainIndex, project.mainExamples[0]];
            project.mainJsFile = project.mainExamples[0].replace(/\.tsx?$/, '.js');
        }
        else {
            project.main = project.mainExamples;
        }
    } else {
        project.main = [project.mainIndex];
        project.mainJsFile = project.mainIndex.replace(/\.tsx?$/, '.js');
    }
    if (project.mainSpec) {
        (<string[]>project.main).push(...project.mainSpec);
    }
    if (!project.noBobrilJsx) {
        const bobriljsxdts = "node_modules/bobril/jsx.d.ts";
        if (fs.existsSync(path.join(project.dir, bobriljsxdts))) {
            (<string[]>project.main).push(bobriljsxdts);
        }
    }
}

export function refreshProjectFromPackageJson(project: bb.IProject, allFiles: { [dir: string]: string[] }): boolean {
    let projectJsonFullPath = path.join(project.dir, 'package.json');
    let projectJsonModified = bb.fileModifiedTime(projectJsonFullPath);
    if (projectJsonModified === project.projectJsonTime && !project.mainAutoDetected && allFiles == null) {
        return project.mainIndex !== null;
    }
    let packageJson = null;
    try {
        packageJson = fs.readFileSync(projectJsonFullPath, 'utf-8');
    } catch (err) {
        project.packageJsonBobril = null;
        project.logCallback('Cannot read package.json ' + err + '. Autodetecting main ts file.');
        if (autodetectMainTs(project)) {
            autodetectMainExample(project, allFiles);
            return true;
        }
        return false;
    }
    project.projectJsonTime = projectJsonModified;
    let packageObj = null;
    try {
        packageObj = JSON.parse(packageJson);
    } catch (err) {
        project.logCallback('Package.json cannot be parsed. ' + err);
        return false;
    }
    if (packageObj.publishConfig && packageObj.publishConfig.registry) {
        project.npmRegistry = packageObj.publishConfig.registry;
    }
    if (packageObj.typescript && typeof packageObj.typescript.main === 'string') {
        let main = packageObj.typescript.main;
        if (!fs.existsSync(path.join(project.dir, main))) {
            project.logCallback('Package.json typescript.main is ' + main + ', but this file does not exists. Aborting.');
            return false;
        }
        project.mainIndex = main;
    } else if (typeof packageObj.main === 'string') {
        let main = packageObj.main;
        let mainTs = main.replace(/\.js$/, '.ts');
        if (fs.existsSync(path.join(project.dir, mainTs))) {
            project.mainIndex = mainTs;
        } else if (fs.existsSync(path.join(project.dir, main))) {
            project.mainIndex = main;
        } else {
            project.logCallback('Package.json main is ' + main + ', but this file does not exists even with ts extension. Aborting.');
            return false;
        }
    } else {
        project.logCallback('Package.json missing typescript.main. Autodetecting main ts file.');
        if (!autodetectMainTs(project)) return false;
    }
    project.devDependencies = Object.keys(packageObj.devDependencies || {});
    project.dependencies = Object.keys(packageObj.dependencies || {});
    project.localize = project.dependencies.some(v => v === "bobril-g11n");
    let bobrilSection = packageObj.bobril;
    project.packageJsonBobril = bobrilSection;
    if (bobrilSection == null) {
        autodetectMainExample(project, allFiles);
        return true;
    }
    if (typeof bobrilSection.title === 'string') {
        project.htmlTitle = bobrilSection.title;
    }
    if (typeof bobrilSection.head === 'string') {
        project.htmlHead = bobrilSection.head;
    }
    if (typeof bobrilSection.dir === 'string') {
        project.outputDir = bobrilSection.dir;
    }
    if (typeof bobrilSection.jsx === 'boolean') {
        project.noBobrilJsx = !bobrilSection.jsx;
    }
    if (project.dependencies.indexOf("bobril") < 0) {
        project.noBobrilJsx = true;
    }
    if (typeof bobrilSection.resourcesAreRelativeToProjectDir === 'boolean') {
        project.resourcesAreRelativeToProjectDir = bobrilSection.resourcesAreRelativeToProjectDir;
    }
    if (typeof bobrilSection.constantOverrides === 'object') {
        project.constantOverrides = bobrilSection.constantOverrides;
    }
    if (typeof bobrilSection.plugins === 'object') {
        project.pluginsConfig = bobrilSection.plugins;
    }
    if (typeof bobrilSection.example === 'string') {
        project.mainExamples = [];
        try {
            if (fs.lstatSync(bobrilSection.example).isDirectory()) {
                let files = fs.readdirSync(bobrilSection.example);
                for (let i = 0; i < files.length; i++) {
                    let file = path.join(project.dir, bobrilSection.example, files[i]);
                    if (fs.lstatSync(file).isDirectory()) continue;
                    project.mainExamples.push(path.relative(project.dir, file));
                }
            }
            else {
                project.mainExamples.push(bobrilSection.example);
            }
        } catch (err) {
            project.logCallback('Cannot read examples ' + err + '. Autodetecting main ts file.');
            if (autodetectMainTs(project)) {
                autodetectMainExample(project, allFiles);
                return true;
            }
            return false;
        }
    }
    if (typeof bobrilSection.additionalResourcesDirectory === 'string') {
        project.additionalResourcesDirectory = bobrilSection.additionalResourcesDirectory;
    }
    autodetectMainExample(project, allFiles);
    return true;
}

export function defineTranslationReporter(project: bb.IProject) {
    project.textForTranslationReporter = (message: bb.TranslationMessage, compilationResult: bb.CompilationResult) => {
        if (typeof message.message != "string") return;
        if (!message.withParams) return;
        let ast = g11n.parse(<string>message.message);
        if (typeof ast === "object" && ast.type === "error") {
            let sc = message.callExpression.getSourceFile();
            let posStart = ts.getLineAndCharacterOfPosition(sc, message.callExpression.pos);
            let posEnd = ts.getLineAndCharacterOfPosition(sc, message.callExpression.end);
            compilationResult.addMessage(true, sc.fileName, "BB0001: " + ast.msg, [posStart.line + 1, posStart.character + 1, posEnd.line + 1, posEnd.character + 1]);
            project.logCallback("Error: " + sc.fileName + "(" + (posStart.line + 1) + "/" + (posStart.character + 1) + ") " + ast.msg);
        }
    };
}

export function emitTranslationsJs(project: bb.IProject, translationDb: bb.TranslationDb) {
    let prefix = project.outputSubDir ? (project.outputSubDir + "/") : "";
    bb.writeTranslationFile('en-US', translationDb.getMessageArrayInLang('en-US'), prefix + 'en-US.js', project.writeFileCallback);
    translationDb.langs.forEach(lang => {
        bb.writeTranslationFile(lang, translationDb.getMessageArrayInLang(lang), prefix + lang + '.js', project.writeFileCallback);
    });
}

export function fillMainSpec(project: bb.IProject): Promise<any> {
    return new Promise((resolve, reject) => {
        glob(project.specGlob, { cwd: project.dir, ignore: "node_modules/**/*" }, (err, matches) => {
            if (err) {
                reject(err);
                return;
            }
            if (matches.length > 0) {
                if (fs.existsSync(path.join(project.dir, "typings/jasmine/jasmine.d.ts"))) {
                    matches.push("typings/jasmine/jasmine.d.ts");
                } else {
                    matches.push(bbDirRoot + "/typings/jasmine/jasmine.d.ts");
                }
            }
            project.mainSpec = matches;
            resolve();
        });
    });
}

export function compileProject(project: bb.IProject): Promise<bb.CompilationResult> {
    var compilationCache = new bb.CompilationCache();
    var translationDb = new bb.TranslationDb();
    defineTranslationReporter(project);
    let trDir = path.join(project.dir, "translations");
    if (project.localize) {
        translationDb.loadLangDbs(trDir);
        project.compileTranslation = translationDb;
    }
    project.writeFileCallback = (fn: string, b: Buffer) => {
        let fullname = path.join(project.outputDir, fn);
        console.log("Writing " + fullname);
        bb.mkpathsync(path.dirname(fullname));
        fs.writeFileSync(fullname, b);
    };
    translationDb.clearBeforeCompilation();

    plugins.pluginsLoader.executeEntryMethod(plugins.EntryMethodType.afterStartCompileProcess, project);

    compilationCache.clearFileTimeModifications();
    return compilationCache.compile(project).then(() => {
        if (!project.totalBundle) {
            if (project.fastBundle) {
                bb.updateLoaderJsByCC(compilationCache, project.writeFileCallback);
            } else {
                bb.updateSystemJsByCC(compilationCache, project.writeFileCallback);
            }
        }
        bb.updateIndexHtml(project);
        if (project.localize && translationDb.changeInMessageIds) {
            console.log("Writing localizations");
            emitTranslationsJs(project, translationDb);
        }
        if ((project.updateTranslations == null &&
            translationDb.langs.length > 0 && translationDb.addedMessage) ||
            project.updateTranslations === true
        ) {
            console.log("Writing translations");
            if (project.updateTranslations === true) {
                translationDb.pruneUnusedMesssages();
            }
            translationDb.saveLangDbs(trDir);
        }
        return compilationCache.getResult();
    });
}
