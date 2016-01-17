import * as bb from '../index';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";
import * as ts from "typescript";
import * as g11n from "./msgFormatParser";
import * as glob from "glob";
import * as minimatch from "minimatch";
import { deepEqual } from './deepEqual';

export function createProjectFromDir(path: string): bb.IProject {
    let project: bb.IProject = {
        dir: path.replace(/\\/g, '/'),
        main: null,
        mainIndex: null,
        mainJsFile: null,
        specGlob: "**/*@(.s|S)pec.ts?(x)",
        options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5, skipDefaultLibCheck: true }
    };
    return project;
}

function autodetectMainTs(project: bb.IProject): boolean {
    const searchMainTsList = ['index.ts', 'app.ts', 'lib.ts', 'src/index.ts', 'src/app.ts', 'src/lib.ts'];
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

function runUpdateTsConfig(cwd: string, files: { [dir: string]: string[] }) {
    let tscfgPath = path.join(cwd, 'tsconfig.json');
    let tscfg = null;
    if (fs.existsSync(tscfgPath)) {
        try {
            tscfg = JSON.parse(fs.readFileSync(tscfgPath, 'utf8'));
        } catch (e) {
            console.log("Failed to read and parse " + tscfgPath, e);
        }
    }
    if (tscfg == null) {
        tscfg = {
            compilerOptions: {
                target: "es6",
                module: "commonjs",
                moduleResolution: "node"
            },
            compileOnSave: false,
            files: []
        };
    }
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
    fileList.sort();
    if (deepEqual(tscfg.files, fileList))
        return;
    tscfg.files = fileList;
    try {
        fs.writeFileSync(tscfgPath, JSON.stringify(tscfg, null, 4));
    } catch (e) {
        console.log("Failed to read and parse " + tscfgPath, e);
    }
}

function autodetectMainExample(project: bb.IProject, allFiles: { [dir: string]: string[] }) {
    if (project.mainExample == null && project.mainIndex === "index.ts") {
        if (fs.existsSync(path.join(project.dir, "example.ts"))) {
            project.mainExample = "example.ts";
        }
    }
    if (allFiles != null) {
        let re = minimatch.makeRe(project.specGlob);
        let specList = [];
        let dirs = Object.keys(allFiles);
        for (let i = 0; i < dirs.length; i++) {
            let d = dirs[i];
            let f = allFiles[d];
            if (d === ".") {
                d = "";
            } else {
                d = d + '/';
            }
            for (let j = 0; j < f.length; j++) {
                let ff = d + f[j];
                if (re.test(ff))
                    specList.push(ff);
            }
        }
        if (specList.length > 0) {
            if (allFiles["typings/jasmine"] && allFiles["typings/jasmine"].indexOf("jasmine.d.ts") >= 0) {
                specList.push("typings/jasmine/jasmine.d.ts");
            } else {
                allFiles[bbDirRoot + "/typings/jasmine"] = ["jasmine.d.ts"];
                specList.push(bbDirRoot + "/typings/jasmine/jasmine.d.ts");
            }
            project.mainSpec = specList;
        } else {
            project.mainSpec = null;
        }
        runUpdateTsConfig(project.dir, allFiles);
    }
    if (project.mainExample != null) {
        project.main = [project.mainIndex, project.mainExample];
        project.mainJsFile = project.mainExample.replace(/\.ts$/, '.js');
    } else {
        project.main = [project.mainIndex];
        project.mainJsFile = project.mainIndex.replace(/\.ts$/, '.js');
    }
    if (project.mainSpec) {
        (<string[]>project.main).push(...project.mainSpec);
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
    if (packageObj.typescript && typeof packageObj.typescript.main === 'string') {
        let main = packageObj.typescript.main;
        if (!fs.existsSync(path.join(project.dir, main))) {
            project.logCallback('Package.json typescript.main is ' + main + ', but this file does not exists. Aborting.');
            return false;
        }
        project.mainIndex = main;
    } else {
        project.logCallback('Package.json missing typescript.main. Autodetecting main ts file.');
        if (!autodetectMainTs(project)) return false;
        if (project == null) return null;
    }
    let deps = Object.keys(packageObj.dependencies);
    project.localize = deps.some(v => v === "bobril-g11n");
    let bobrilSection = packageObj.bobril;
    if (bobrilSection == null) {
        autodetectMainExample(project, allFiles);
        return true;
    }
    if (typeof bobrilSection.title === 'string') {
        project.htmlTitle = bobrilSection.title;
    }
    if (typeof bobrilSection.dir === 'string') {
        project.outputDir = bobrilSection.dir;
    }
    if (typeof bobrilSection.resourcesAreRelativeToProjectDir === 'boolean') {
        project.resourcesAreRelativeToProjectDir = bobrilSection.resourcesAreRelativeToProjectDir;
    }
    if (typeof bobrilSection.constantOverrides === 'object') {
        project.constantOverrides = bobrilSection.constantOverrides;
    }
    if (typeof bobrilSection.example === 'string') {
        project.mainExample = bobrilSection.example;
    }
    autodetectMainExample(project, allFiles);
    return true;
}

export function defineTranslationReporter(project: bb.IProject) {
    project.textForTranslationReporter = (message: bb.TranslationMessage) => {
        if (typeof message.message != "string") return;
        if (!message.withParams) return;
        let ast = g11n.parse(<string>message.message);
        if (typeof ast === "object" && ast.type === "error") {
            let sc = message.callExpression.getSourceFile();
            let pos = ts.getLineAndCharacterOfPosition(sc, message.callExpression.pos);
            project.logCallback("Error: " + sc.fileName + "(" + (pos.line + 1) + "/" + (pos.character + 1) + ") " + ast.msg);
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

export function compileProject(project: bb.IProject): Promise<any> {
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
        if (translationDb.langs.length > 0 && translationDb.addedMessage) {
            console.log("Writing translations");
            translationDb.saveLangDbs(trDir);
        }
    });
}
