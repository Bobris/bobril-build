var bb = require('../index');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var cps = Object.create(null);
function createProject(param) {
    var cp = cps[param.id];
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
            project: bb.createProjectFromDir(param.dir)
        };
        cps[param.id] = cp;
        cp.project.logCallback = function (text) {
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
    var cp = cps[param];
    if (cp) {
        cp.promise = cp.promise.then(function () {
            process.send({ command: "refreshed", param: bb.refreshProjectFromPackageJson(cp.project) });
        });
    }
    else {
        process.send({ command: "Cannot refresh nonexisting project", param: param });
    }
}
exports.refreshProject = refreshProject;
function disposeProject(param) {
    var cp = cps[param];
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
    var cp = cps[param.id];
    if (cp) {
        cp.promise = cp.promise.then(function () {
            Object.assign(cp.project, param.options);
            process.send({ command: "options", param: cp.project });
        });
    }
    else {
        process.send({ command: "Cannot set options to nonexisting project", param: param.id });
    }
}
exports.setProjectOptions = setProjectOptions;
function compile(param) {
    var cp = cps[param];
    if (cp) {
        cp.promise = new Promise(function (resolve, reject) {
            cp.promise.then(function () {
                bb.defineTranslationReporter(cp.project);
                if (cp.project.localize) {
                    bb.defineTranslationReplacer(cp.project, cp.translationDb);
                }
                else {
                    cp.project.textForTranslationReplacer = null;
                }
                cp.compilationCache.clearFileTimeModifications();
                return cp.compilationCache.compile(cp.project).then(function () {
                    if (!cp.project.totalBundle)
                        bb.updateSystemJsByCC(cp.compilationCache, cp.project.writeFileCallback);
                    bb.updateIndexHtml(cp.project);
                    if (cp.project.localize) {
                        bb.emitTranslationsJs(cp.project, cp.translationDb);
                    }
                }).then(function () {
                    process.send({ command: "compileOk" });
                }, function (err) {
                    process.send({ command: "compileFailed", param: err });
                });
            }).then(function () { return resolve(null); }, function () { return resolve(null); });
        });
    }
    else {
        process.send({ command: "Cannot compile nonexisting project", param: param });
    }
}
exports.compile = compile;
