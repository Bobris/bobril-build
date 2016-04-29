"use strict";
const bb = require('./index');
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
const fs = require("fs");
const ts = require("typescript");
const g11n = require("./msgFormatParser");
const glob = require("glob");
const minimatch = require("minimatch");
const deepEqual_1 = require('./deepEqual');
const plugins = require("./pluginsLoader");
function createProjectFromDir(path) {
    let project = {
        dir: path.replace(/\\/g, '/'),
        main: null,
        mainIndex: null,
        mainJsFile: null,
        noBobrilJsx: false,
        specGlob: "**/*@(.s|S)pec.ts?(x)",
        options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5, skipDefaultLibCheck: true }
    };
    return project;
}
exports.createProjectFromDir = createProjectFromDir;
function autodetectMainTs(project) {
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
function runUpdateTsConfig(cwd, files, jsx) {
    let tscfgPath = path.join(cwd, 'tsconfig.json');
    let tscfg = {};
    let origtscfg = {};
    if (fs.existsSync(tscfgPath)) {
        try {
            let content = fs.readFileSync(tscfgPath, 'utf8');
            tscfg = JSON.parse(content);
            origtscfg = JSON.parse(content);
        }
        catch (e) {
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
        moduleResolution: "node" });
    if (jsx) {
        Object.assign(tscfg.compilerOptions, {
            jsx: "react",
            reactNamespace: "b"
        });
    }
    else {
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
        }
        else {
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
    if (deepEqual_1.deepEqual(tscfg, origtscfg))
        return;
    try {
        fs.writeFileSync(tscfgPath, JSON.stringify(tscfg, null, 4));
    }
    catch (e) {
        console.log("Failed to read and parse " + tscfgPath, e);
    }
}
function autodetectMainExample(project, allFiles) {
    if (project.mainExample == null && project.mainIndex === "index.ts") {
        if (fs.existsSync(path.join(project.dir, "example.ts"))) {
            project.mainExample = "example.ts";
        }
    }
    if (allFiles != null) {
        let re = minimatch.makeRe(project.specGlob);
        let specList = [];
        let dirs = Object.keys(allFiles);
        let containsJasmineDefFile = false;
        for (let i = 0; i < dirs.length; i++) {
            let d = dirs[i];
            if (d.indexOf('node_modules') != -1)
                continue;
            let f = allFiles[d];
            if (d === ".") {
                d = "";
            }
            else {
                d = d + '/';
            }
            for (let j = 0; j < f.length; j++) {
                let ff = d + f[j];
                if (re.test(ff))
                    specList.push(ff);
                if (f[j] == 'jasmine.d.ts') {
                    specList.push(ff);
                    containsJasmineDefFile = true;
                }
            }
        }
        if (specList.length > 0) {
            if (!containsJasmineDefFile) {
                allFiles[bbDirRoot + "/typings/jasmine"] = ["jasmine.d.ts"];
                specList.push(bbDirRoot + "/typings/jasmine/jasmine.d.ts");
            }
            project.mainSpec = specList;
        }
        else {
            project.mainSpec = null;
        }
        runUpdateTsConfig(project.dir, allFiles, !project.noBobrilJsx);
    }
    if (project.mainExample != null) {
        project.main = [project.mainIndex, project.mainExample];
        project.mainJsFile = project.mainExample.replace(/\.tsx?$/, '.js');
    }
    else {
        project.main = [project.mainIndex];
        project.mainJsFile = project.mainIndex.replace(/\.tsx?$/, '.js');
    }
    if (project.mainSpec) {
        project.main.push(...project.mainSpec);
    }
    if (!project.noBobrilJsx) {
        const bobriljsxdts = "node_modules/bobril/jsx.d.ts";
        if (fs.existsSync(path.join(project.dir, bobriljsxdts))) {
            project.main.push(bobriljsxdts);
        }
    }
}
function refreshProjectFromPackageJson(project, allFiles) {
    let projectJsonFullPath = path.join(project.dir, 'package.json');
    let projectJsonModified = bb.fileModifiedTime(projectJsonFullPath);
    if (projectJsonModified === project.projectJsonTime && !project.mainAutoDetected && allFiles == null) {
        return project.mainIndex !== null;
    }
    let packageJson = null;
    try {
        packageJson = fs.readFileSync(projectJsonFullPath, 'utf-8');
    }
    catch (err) {
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
    }
    catch (err) {
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
    }
    else if (typeof packageObj.main === 'string') {
        let main = packageObj.main;
        let mainTs = main.replace(/\.js$/, '.ts');
        if (fs.existsSync(path.join(project.dir, mainTs))) {
            project.mainIndex = mainTs;
        }
        else if (fs.existsSync(path.join(project.dir, main))) {
            project.mainIndex = main;
        }
        else {
            project.logCallback('Package.json main is ' + main + ', but this file does not exists even with ts extension. Aborting.');
            return false;
        }
    }
    else {
        project.logCallback('Package.json missing typescript.main. Autodetecting main ts file.');
        if (!autodetectMainTs(project))
            return false;
    }
    project.devDependencies = Object.keys(packageObj.devDependencies || {});
    project.dependencies = Object.keys(packageObj.dependencies || {});
    project.localize = project.dependencies.some(v => v === "bobril-g11n");
    let bobrilSection = packageObj.bobril;
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
exports.refreshProjectFromPackageJson = refreshProjectFromPackageJson;
function defineTranslationReporter(project) {
    project.textForTranslationReporter = (message, compilationResult) => {
        if (typeof message.message != "string")
            return;
        if (!message.withParams)
            return;
        let ast = g11n.parse(message.message);
        if (typeof ast === "object" && ast.type === "error") {
            let sc = message.callExpression.getSourceFile();
            let posStart = ts.getLineAndCharacterOfPosition(sc, message.callExpression.pos);
            let posEnd = ts.getLineAndCharacterOfPosition(sc, message.callExpression.end);
            compilationResult.addMessage(true, sc.fileName, "BB0001: " + ast.msg, [posStart.line + 1, posStart.character + 1, posEnd.line + 1, posEnd.character + 1]);
            project.logCallback("Error: " + sc.fileName + "(" + (posStart.line + 1) + "/" + (posStart.character + 1) + ") " + ast.msg);
        }
    };
}
exports.defineTranslationReporter = defineTranslationReporter;
function emitTranslationsJs(project, translationDb) {
    let prefix = project.outputSubDir ? (project.outputSubDir + "/") : "";
    bb.writeTranslationFile('en-US', translationDb.getMessageArrayInLang('en-US'), prefix + 'en-US.js', project.writeFileCallback);
    translationDb.langs.forEach(lang => {
        bb.writeTranslationFile(lang, translationDb.getMessageArrayInLang(lang), prefix + lang + '.js', project.writeFileCallback);
    });
}
exports.emitTranslationsJs = emitTranslationsJs;
function fillMainSpec(project) {
    return new Promise((resolve, reject) => {
        glob(project.specGlob, { cwd: project.dir, ignore: "node_modules/**/*" }, (err, matches) => {
            if (err) {
                reject(err);
                return;
            }
            if (matches.length > 0) {
                if (fs.existsSync(path.join(project.dir, "typings/jasmine/jasmine.d.ts"))) {
                    matches.push("typings/jasmine/jasmine.d.ts");
                }
                else {
                    matches.push(bbDirRoot + "/typings/jasmine/jasmine.d.ts");
                }
            }
            project.mainSpec = matches;
            resolve();
        });
    });
}
exports.fillMainSpec = fillMainSpec;
function compileProject(project) {
    var compilationCache = new bb.CompilationCache();
    var translationDb = new bb.TranslationDb();
    defineTranslationReporter(project);
    let trDir = path.join(project.dir, "translations");
    if (project.localize) {
        translationDb.loadLangDbs(trDir);
        project.compileTranslation = translationDb;
    }
    project.writeFileCallback = (fn, b) => {
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
            }
            else {
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
exports.compileProject = compileProject;
//# sourceMappingURL=compileProject.js.map