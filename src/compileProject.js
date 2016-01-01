"use strict";
var bb = require('../index');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require("fs");
var ts = require("typescript");
var g11n = require("../node_modules/bobril-g11n/src/msgFormatParser");
var glob = require("glob");
function createProjectFromDir(path) {
    var project = {
        dir: path.replace(/\\/g, '/'),
        main: null,
        mainIndex: null,
        mainJsFile: null,
        specGlob: "spec/**/*Spec.ts?(x)",
        options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5, skipDefaultLibCheck: true }
    };
    return project;
}
exports.createProjectFromDir = createProjectFromDir;
function autodetectMainTs(project) {
    var searchMainTsList = ['index.ts', 'app.ts', 'lib.ts', 'src/index.ts', 'src/app.ts', 'src/lib.ts'];
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
function autodetectMainExample(project) {
    if (project.mainExample == null && project.mainIndex === "index.ts") {
        if (fs.existsSync(path.join(project.dir, "example.ts"))) {
            project.mainExample = "example.ts";
        }
    }
    if (project.mainExample != null) {
        project.main = [project.mainIndex, project.mainExample];
        project.mainJsFile = project.mainExample.replace(/\.ts$/, '.js');
    }
    else {
        project.main = project.mainIndex;
        project.mainJsFile = project.mainIndex.replace(/\.ts$/, '.js');
    }
}
function refreshProjectFromPackageJson(project) {
    var projectJsonFullPath = path.join(project.dir, 'package.json');
    var projectJsonModified = bb.fileModifiedTime(projectJsonFullPath);
    if (projectJsonModified === project.projectJsonTime && !project.mainAutoDetected) {
        return project.mainIndex !== null;
    }
    var packageJson = null;
    try {
        packageJson = fs.readFileSync(projectJsonFullPath, 'utf-8');
    }
    catch (err) {
        project.logCallback('Cannot read package.json ' + err + '. Autodetecting main ts file.');
        if (autodetectMainTs(project)) {
            autodetectMainExample(project);
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
    else {
        project.logCallback('Package.json missing typescript.main. Autodetecting main ts file.');
        if (!autodetectMainTs(project))
            return false;
        if (project == null)
            return null;
    }
    var deps = Object.keys(packageObj.dependencies);
    project.localize = deps.some(function (v) { return v === "bobril-g11n"; });
    var bobrilSection = packageObj.bobril;
    if (bobrilSection == null) {
        autodetectMainExample(project);
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
    autodetectMainExample(project);
    return true;
}
exports.refreshProjectFromPackageJson = refreshProjectFromPackageJson;
function defineTranslationReporter(project) {
    project.textForTranslationReporter = function (message) {
        if (typeof message.message != "string")
            return;
        if (!message.withParams)
            return;
        var ast = g11n.parse(message.message);
        if (typeof ast === "object" && ast.type === "error") {
            var sc = message.callExpression.getSourceFile();
            var pos = ts.getLineAndCharacterOfPosition(sc, message.callExpression.pos);
            project.logCallback("Error: " + sc.fileName + "(" + (pos.line + 1) + "/" + (pos.character + 1) + ") " + ast.msg);
        }
    };
}
exports.defineTranslationReporter = defineTranslationReporter;
function emitTranslationsJs(project, translationDb) {
    bb.writeTranslationFile('en-US', translationDb.getMessageArrayInLang('en-US'), 'en-US.js', project.writeFileCallback);
    translationDb.langs.forEach(function (lang) {
        bb.writeTranslationFile(lang, translationDb.getMessageArrayInLang(lang), lang + '.js', project.writeFileCallback);
    });
}
exports.emitTranslationsJs = emitTranslationsJs;
function fillMainSpec(project) {
    return new Promise(function (resolve, reject) {
        glob(project.specGlob, { cwd: project.dir }, function (err, matches) {
            if (err) {
                reject(err);
                return;
            }
            if (fs.existsSync(path.join(project.dir, "typings/jasmine/jasmine.d.ts"))) {
                matches.push("typings/jasmine/jasmine.d.ts");
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
