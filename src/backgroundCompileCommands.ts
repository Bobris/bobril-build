import * as bb from '../index';
import * as ts from 'typescript';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";

interface ICompleteProject {
    compilationCache: bb.CompilationCache;
    translationDb: bb.TranslationDb;
    memoryFs: { [name: string]: Buffer };
    projectDir: string;
    project: bb.IProject;
    promise: Promise<any>;
    translationDirty: boolean;
}

let cps: { [id: string]: ICompleteProject } = Object.create(null);

export function createProject(param: { id: string, dir: string }) {
    let cp = cps[param.id];
    if (cp) {
        process.send({ command: "Cannot create project, already exists", param });
    } else {
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
        cp.project.writeFileCallback = function write(fn: string, b: Buffer) {
            cp.memoryFs[fn] = b;
            process.send({ command: "write", param: { name: fn, buffer: b.toString("binary") } });
        }
    }
}

export function refreshProject(param: string) {
    let cp = cps[param];
    if (cp) {
        cp.promise = cp.promise.then(() => {
            process.send({ command: "refreshed", param: bb.refreshProjectFromPackageJson(cp.project) });
        });
    } else {
        process.send({ command: "Cannot refresh nonexisting project", param });
    }
}

export function disposeProject(param: string) {
    let cp = cps[param];
    if (cp) {
        function dispose() {
            delete cps[param];
            process.send({ command: "disposed", param });
        }
        cp.promise.then(dispose, dispose);
    } else {
        process.send({ command: "Cannot dispose nonexisting project", param });
    }
}

export function setProjectOptions(param: { id: string, options: any }) {
    let cp = cps[param.id];
    if (cp) {
        cp.promise = cp.promise.then(() => {
            Object.assign(cp.project, param.options);
            let resp:bb.IProject = Object.assign({}, cp.project);
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
    } else {
        process.send({ command: "Cannot set options to nonexisting project", param: param.id });
    }
}

export function loadTranslations(param: string) {
    let cp = cps[param];
    if (cp) {
        cp.promise = cp.promise.then(() => {
            let trDir = path.join(cp.project.dir, "translations");
            cp.translationDb.loadLangDbs(trDir);
            process.send({ command: "loaded" });
        });
    } else {
        process.send({ command: "Cannot loadTranslations to nonexisting project", param });
    }
}

export function compile(param: string) {
    let cp = cps[param];
    if (cp) {
        cp.promise = new Promise((resolve, reject) => {
            cp.promise.then(() => {
                bb.defineTranslationReporter(cp.project);
                if (cp.project.localize) {
                    cp.translationDb.clearBeforeCompilation();
                    cp.project.compileTranslation = cp.translationDb;
                } else {
                    cp.project.compileTranslation = null;
                }
                cp.compilationCache.clearFileTimeModifications();
                return cp.compilationCache.compile(cp.project).then(() => {
                    if (!cp.project.totalBundle) bb.updateSystemJsByCC(cp.compilationCache, cp.project.writeFileCallback);
                    bb.updateIndexHtml(cp.project);
                    if (cp.project.localize && cp.translationDb.changeInMessageIds) {
                        bb.emitTranslationsJs(cp.project, cp.translationDb);
                    }
                    if (cp.translationDb.addedMessage) {
                        cp.translationDirty = true;
                    }
                }).then(() => {
                    process.send({ command: "compileOk" });
                }, (err) => {
                    process.send({ command: "compileFailed", param: err });
                });
            }).then(() => resolve(null), () => resolve(null));
        });
    } else {
        process.send({ command: "Cannot compile nonexisting project", param });
    }
}
