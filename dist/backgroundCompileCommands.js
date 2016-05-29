"use strict";
const bb = require('./index');
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
const plugins = require("./pluginsLoader");
const dep = require("./dependenciesChecker");
let cps = Object.create(null);
function createProject(param) {
    let cp = cps[param.id];
    if (cp) {
        process.send({ command: "Cannot create project, already exists", param: param });
    }
    else {
        cp = {
            compilationCache: new bb.CompilationCache(),
            translationDb: new bb.TranslationDb(),
            promise: Promise.resolve(null),
            memoryFs: Object.create(null),
            projectDir: param.dir,
            project: bb.createProjectFromDir(param.dir),
            translationDirty: false
        };
        cps[param.id] = cp;
        cp.project.logCallback = (text) => {
            process.send({ command: "log", param: text });
        };
        cp.project.writeFileCallback = function write(fn, b) {
            cp.memoryFs[fn] = b;
            process.send({ command: "write", param: { name: fn, buffer: b.toString("binary") } });
        };
    }
}
exports.createProject = createProject;
function refreshProject(param) {
    let cp = cps[param.id];
    if (cp) {
        cp.promise = cp.promise.then(() => {
            process.send({ command: "refreshed", param: bb.refreshProjectFromPackageJson(cp.project, param.allFiles) });
        });
    }
    else {
        process.send({ command: "Cannot refresh nonexisting project", param: param });
    }
}
exports.refreshProject = refreshProject;
function disposeProject(param) {
    let cp = cps[param];
    if (cp) {
        function dispose() {
            delete cps[param];
            process.send({ command: "disposed", param: param });
        }
        cp.promise.then(dispose, dispose);
    }
    else {
        process.send({ command: "Cannot dispose nonexisting project", param: param });
    }
}
exports.disposeProject = disposeProject;
function setProjectOptions(param) {
    let cp = cps[param.id];
    if (cp) {
        cp.promise = cp.promise.then(() => {
            Object.assign(cp.project, param.options);
            let resp = Object.assign({}, cp.project);
            resp.compileTranslation = undefined;
            resp.textForTranslationReporter = undefined;
            resp.imgBundleCache = undefined;
            resp.projectJsonTime = undefined;
            resp.lastwrittenIndexHtml = undefined;
            resp.depJsFiles = undefined;
            resp.moduleMap = undefined;
            resp.commonJsTemp = undefined;
            process.send({ command: "options", param: resp });
        });
    }
    else {
        process.send({ command: "Cannot set options to nonexisting project", param: param.id });
    }
}
exports.setProjectOptions = setProjectOptions;
function loadTranslations(param) {
    let cp = cps[param];
    if (cp) {
        cp.promise = cp.promise.then(() => {
            let trDir = path.join(cp.project.dir, "translations");
            cp.translationDb.loadLangDbs(trDir);
            process.send({ command: "loaded" });
        });
    }
    else {
        process.send({ command: "Cannot loadTranslations to nonexisting project", param: param });
    }
}
exports.loadTranslations = loadTranslations;
function compile(param) {
    let cp = cps[param];
    if (cp) {
        cp.promise = new Promise((resolve, reject) => {
            cp.promise.then(() => {
                bb.defineTranslationReporter(cp.project);
                if (cp.project.localize) {
                    cp.translationDb.clearBeforeCompilation();
                    cp.project.compileTranslation = cp.translationDb;
                }
                else {
                    cp.project.compileTranslation = null;
                }
                cp.project.options.sourceRoot = "bb/base/";
                cp.compilationCache.clearFileTimeModifications();
                return cp.compilationCache.compile(cp.project).then(() => {
                    if (!cp.project.totalBundle) {
                        if (cp.project.fastBundle) {
                            bb.updateLoaderJsByCC(cp.compilationCache, cp.project.writeFileCallback);
                        }
                        else {
                            bb.updateSystemJsByCC(cp.compilationCache, cp.project.writeFileCallback);
                        }
                    }
                    bb.updateIndexHtml(cp.project);
                    if (cp.project.mainSpec != null) {
                        bb.updateTestHtml(cp.project);
                    }
                    if (cp.project.localize && cp.translationDb.changeInMessageIds) {
                        bb.emitTranslationsJs(cp.project, cp.translationDb);
                    }
                    if (cp.translationDb.addedMessage) {
                        cp.translationDirty = true;
                    }
                });
            }).then(() => {
                let result = cp.compilationCache.getResult();
                process.send({ command: "compileOk", param: { errors: result.errors, warnings: result.warnings, messages: result.messages, hasTests: cp.project.mainSpec != null } });
            }, (err) => {
                process.send({ command: "compileFailed", param: err.toString() });
            }).then(() => resolve(null), () => resolve(null));
        });
    }
    else {
        process.send({ command: "Cannot compile nonexisting project", param: param });
    }
}
exports.compile = compile;
function executePlugins(param) {
    let cp = cps[param.id];
    if (!cp) {
        process.send({ command: "Cannot compile nonexisting project", param: param });
        return;
    }
    let res = plugins.pluginsLoader.executeEntryMethod(param.method, cp.project);
    process.send({ command: "finished", param: res });
}
exports.executePlugins = executePlugins;
function installDependencies(param) {
    let cp = cps[param.id];
    if (!cp) {
        process.send({ command: "Cannot compile nonexisting project", param: param });
        return;
    }
    let res = dep.installMissingDependencies(cp.project);
    process.send({ command: "finished", param: res });
}
exports.installDependencies = installDependencies;
//# sourceMappingURL=backgroundCompileCommands.js.map