import * as bb from '../index';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";
import * as ts from "typescript";
import * as g11n from "../node_modules/bobril-g11n/src/msgFormatParser";

export function createProjectFromDir(path: string): bb.IProject {
    let project: bb.IProject = {
        dir: path.replace(/\\/g, '/'),
        main: null,
        mainJsFile: null,
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
            project.main = fn;
            project.mainJsFile = fn.replace(/\.ts$/, '.js');
            project.logCallback("Info: Main found " + fn);
            return true;
        }
    }
    project.logCallback('Error: Main not found. Searched: ' + searchMainTsList.join(', '));
    return false;
}

export function refreshProjectFromPackageJson(project: bb.IProject): boolean {
    let projectJsonFullPath = path.join(project.dir, 'package.json');
    let projectJsonModified = bb.fileModifiedTime(projectJsonFullPath);
    if (projectJsonModified === project.projectJsonTime && !project.mainAutoDetected) {
        return project.main !== null;
    }
    let packageJson = null;
    try {
        packageJson = fs.readFileSync(projectJsonFullPath, 'utf-8');
    } catch (err) {
        project.logCallback('Cannot read package.json ' + err + '. Autodetecting main ts file.');
        return autodetectMainTs(project);
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
        if (!fs.existsSync(main)) {
            project.logCallback('Package.json typescript.main is ' + main + ', but this file does not exists. Aborting.');
            return false;
        }
        project.main = main;
        project.mainJsFile = main.replace(/\.ts$/, '.js');
    } else {
        project.logCallback('Package.json missing typescript.main. Autodetecting main ts file.');
        if (!autodetectMainTs(project)) return false;
        if (project == null) return null;
    }
    let deps = Object.keys(packageObj.dependencies);
    project.localize = deps.some(v=> v === "bobril-g11n");
    let bobrilSection = packageObj.bobril;
    if (bobrilSection == null) return true;
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
    bb.writeTranslationFile('en-US', translationDb.getMessageArrayInLang('en-US'), 'en-US.js', project.writeFileCallback);
    translationDb.langs.forEach(lang=> {
        bb.writeTranslationFile(lang, translationDb.getMessageArrayInLang(lang), lang + '.js', project.writeFileCallback);
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
        if (!project.totalBundle) bb.updateSystemJsByCC(compilationCache, project.writeFileCallback);
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
