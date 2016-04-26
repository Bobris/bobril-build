"use strict";
var bb = require('../index');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require("fs");
var ts = require("typescript");
var g11n = require("./msgFormatParser");
var glob = require("glob");
var minimatch = require("minimatch");
var deepEqual_1 = require('./deepEqual');
function createProjectFromDir(path) {
    var project = {
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
    var searchMainTsList = ['index.ts', 'app.ts', 'lib.ts', 'src/index.ts', 'src/app.ts', 'src/lib.ts', 'app.tsx'];
    project.mainAutoDetected = true;
    for (var i = 0; i < searchMainTsList.length; i++) {
        var fn = searchMainTsList[i];
        if (fs.existsSync(path.join(project.dir, fn))) {
            project.mainIndex = fn;
            project.logCallback("Info: Main found " + fn);
            return true;
        }
    }
    project.logCallback('Error: Main not found. Searched: ' + searchMainTsList.join(', '));
    return false;
}
var bbDirRoot = path.dirname(__dirname.replace(/\\/g, "/"));
function runUpdateTsConfig(cwd, files, jsx) {
    var tscfgPath = path.join(cwd, 'tsconfig.json');
    var tscfg = {};
    var origtscfg = {};
    if (fs.existsSync(tscfgPath)) {
        try {
            var content = fs.readFileSync(tscfgPath, 'utf8');
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
    var fileList = [];
    var dirs = Object.keys(files);
    for (var i = 0; i < dirs.length; i++) {
        var d = dirs[i];
        if (/^node_modules/ig.test(d))
            continue;
        var f = files[d];
        if (d === ".") {
            d = "";
        }
        else {
            d = d + '/';
        }
        for (var j = 0; j < f.length; j++)
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
        var re = minimatch.makeRe(project.specGlob);
        var specList = [];
        var dirs = Object.keys(allFiles);
        var containsJasmineDefFile = false;
        for (var i = 0; i < dirs.length; i++) {
            var d = dirs[i];
            if (d.indexOf('node_modules') != -1)
                continue;
            var f = allFiles[d];
            if (d === ".") {
                d = "";
            }
            else {
                d = d + '/';
            }
            for (var j = 0; j < f.length; j++) {
                var ff = d + f[j];
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
        (_a = project.main).push.apply(_a, project.mainSpec);
    }
    if (!project.noBobrilJsx) {
        var bobriljsxdts = "node_modules/bobril/jsx.d.ts";
        if (fs.existsSync(path.join(project.dir, bobriljsxdts))) {
            project.main.push(bobriljsxdts);
        }
    }
    var _a;
}
function refreshProjectFromPackageJson(project, allFiles) {
    var projectJsonFullPath = path.join(project.dir, 'package.json');
    var projectJsonModified = bb.fileModifiedTime(projectJsonFullPath);
    if (projectJsonModified === project.projectJsonTime && !project.mainAutoDetected && allFiles == null) {
        return project.mainIndex !== null;
    }
    var packageJson = null;
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
    var packageObj = null;
    try {
        packageObj = JSON.parse(packageJson);
    }
    catch (err) {
        project.logCallback('Package.json cannot be parsed. ' + err);
        return false;
    }
    if (packageObj.typescript && typeof packageObj.typescript.main === 'string') {
        var main = packageObj.typescript.main;
        if (!fs.existsSync(path.join(project.dir, main))) {
            project.logCallback('Package.json typescript.main is ' + main + ', but this file does not exists. Aborting.');
            return false;
        }
        project.mainIndex = main;
    }
    else if (typeof packageObj.main === 'string') {
        var main = packageObj.main;
        var mainTs = main.replace(/\.js$/, '.ts');
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
    var deps = Object.keys(packageObj.dependencies || {});
    project.localize = deps.some(function (v) { return v === "bobril-g11n"; });
    var bobrilSection = packageObj.bobril;
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
    project.textForTranslationReporter = function (message, compilationResult) {
        if (typeof message.message != "string")
            return;
        if (!message.withParams)
            return;
        var ast = g11n.parse(message.message);
        if (typeof ast === "object" && ast.type === "error") {
            var sc = message.callExpression.getSourceFile();
            var posStart = ts.getLineAndCharacterOfPosition(sc, message.callExpression.pos);
            var posEnd = ts.getLineAndCharacterOfPosition(sc, message.callExpression.end);
            compilationResult.addMessage(true, sc.fileName, "BB0001: " + ast.msg, [posStart.line + 1, posStart.character + 1, posEnd.line + 1, posEnd.character + 1]);
            project.logCallback("Error: " + sc.fileName + "(" + (posStart.line + 1) + "/" + (posStart.character + 1) + ") " + ast.msg);
        }
    };
}
exports.defineTranslationReporter = defineTranslationReporter;
function emitTranslationsJs(project, translationDb) {
    var prefix = project.outputSubDir ? (project.outputSubDir + "/") : "";
    bb.writeTranslationFile('en-US', translationDb.getMessageArrayInLang('en-US'), prefix + 'en-US.js', project.writeFileCallback);
    translationDb.langs.forEach(function (lang) {
        bb.writeTranslationFile(lang, translationDb.getMessageArrayInLang(lang), prefix + lang + '.js', project.writeFileCallback);
    });
}
exports.emitTranslationsJs = emitTranslationsJs;
function fillMainSpec(project) {
    return new Promise(function (resolve, reject) {
        glob(project.specGlob, { cwd: project.dir, ignore: "node_modules/**/*" }, function (err, matches) {
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
    var trDir = path.join(project.dir, "translations");
    if (project.localize) {
        translationDb.loadLangDbs(trDir);
        project.compileTranslation = translationDb;
    }
    project.writeFileCallback = function (fn, b) {
        var fullname = path.join(project.outputDir, fn);
        console.log("Writing " + fullname);
        bb.mkpathsync(path.dirname(fullname));
        fs.writeFileSync(fullname, b);
    };
    translationDb.clearBeforeCompilation();
    compilationCache.clearFileTimeModifications();
    return compilationCache.compile(project).then(function () {
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
