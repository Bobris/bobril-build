import * as childProcess from 'child_process';
import * as plugins from "./pluginsLoader"
import * as bb from './index';
import * as chalk from 'chalk';
import * as notifier from 'node-notifier';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";

export const bbDirRoot = path.dirname(__dirname.replace(/\\/g, "/"));

export let testServer: bb.TestServer = new bb.TestServer();

testServer.getSource = (loc: string) => {
    if (/\/bundle.js.map$/.test(loc))
        return memoryFs["bundle.js.map"];
    return null;
}

export let mainServer: bb.MainServer = new bb.MainServer(testServer);

export var memoryFs: { [name: string]: Buffer } = Object.create(null);

export function writeToMemoryFs(fn: string, b: Buffer) {
    memoryFs[fn.toLowerCase()] = b;
}

export function startBackgroundProcess(name: string, callbacks: {}): (command: string, param?: any, callbacks?: {}) => void {
    let child = childProcess.fork(__dirname.replace(/\\/g, "/") + "/cli", ["background"]);
    let currentCallbacks = callbacks || {};
    if (!currentCallbacks["error"]) {
        currentCallbacks["error"] = (param) => {
            console.log(name + ":responded with error " + param);
        };
    }
    child.on("error", (err) => {
        console.log(name + ":" + err);
    });
    child.on("message", ({ command, param }) => {
        if (typeof currentCallbacks[command] === "function") {
            currentCallbacks[command](param);
        } else {
            console.log(name + ":" + "unknown response command " + command + " with parameter " + JSON.stringify(param));
        }
    });
    child.on("exit", () => {
        if (typeof currentCallbacks["exit"] === "function") {
            currentCallbacks["exit"]();
        } else {
            console.log(name + ":" + "exited without anybody noticing");
        }
    });
    return (command: string, param?: any, callbacks?: {}) => {
        Object.assign(currentCallbacks, callbacks);
        child.send({ command, param });
    };
}

let watchProcess: (command: string, param?: any, callbacks?: {}) => void = null;

export function startWatchProcess(notify: (allFiles: { [dir: string]: string[] }) => Promise<any>) {
    watchProcess = startBackgroundProcess("watch", {});
    let startWatchTime = Date.now();
    let prevPromise = Promise.resolve();
    let paths = ['**/*.ts?(x)', '**/package.json'];
    plugins.pluginsLoader.executeEntryMethod(plugins.EntryMethodType.updateWatchPaths, paths);
    watchProcess("watch", { cwd: bb.getCurProjectDir(), paths, filter: '\\.tsx?$', updateTsConfig: true }, {
        watchChange(param: { [dir: string]: string[] }) {
            if (startWatchTime != 0) {
                console.log("Watching ready in " + (Date.now() - startWatchTime).toFixed(0) + "ms");
                startWatchTime = 0;
            }
            prevPromise.then(() => {
                prevPromise = notify(param);
            })
        },
        exit() {
            console.log("watch process exited restarting");
            startWatchProcess(notify);
        }
    });
}

export interface ICompileProcess {
    refresh(allFiles: { [dir: string]: string[] }): Promise<any>;
    setOptions(options: any): Promise<bb.IProject>;
    callPlugins(method: plugins.EntryMethodType): Promise<any>;
    loadTranslations(): Promise<any>;
    installDependencies(): Promise<any>;
    compile(writer?: (name: string, content: Buffer) => void): Promise<{ errors: number, warnings: number, hasTests: boolean }>;
    stop(): void;
}

let lastId = 0;
export function startCompileProcess(compilationPath: string): ICompileProcess {
    let compileProcess = startBackgroundProcess("compile", {});
    let myId = "" + (lastId++);
    compileProcess("createProject", { id: myId, dir: compilationPath });
    return {
        stop() {
            compileProcess("disposeProject", myId, { exit() { } });
        },
        refresh(allFiles: { [dir: string]: string[] }): Promise<any> {
            return new Promise((resolve, reject) => {
                compileProcess("refreshProject", { id: myId, allFiles }, {
                    log(param) { console.log(param) },
                    refreshed(param: boolean) {
                        if (param) resolve(); else reject(new Error("Refresh failed"));
                    },
                });
            });
        },
        setOptions(options: any): Promise<any> {
            return new Promise((resolve, reject) => {
                compileProcess("setProjectOptions", { id: myId, options }, {
                    log(param) { console.log(param) },
                    options(param: any) {
                        resolve(param);
                    },
                });
            });
        },
        installDependencies(): Promise<any> {
            return new Promise((resolve, reject) => {
                compileProcess("installDependencies", { id: myId }, {
                    log(param) { console.log(param) },
                    finished(param: any) {
                        resolve(param);
                    },
                });
            });

        },
        callPlugins(method: plugins.EntryMethodType): Promise<any> {
            return new Promise((resolve, reject) => {
                compileProcess("callPlugins", { id: myId, method: method }, {
                    log(param) { console.log(param) },
                    finished(param: any) {
                        resolve(param);
                    },
                });
            });
        },
        loadTranslations(): Promise<any> {
            return new Promise((resolve, reject) => {
                compileProcess("loadTranslations", myId, {
                    log(param) { console.log(param) },
                    loaded() {
                        resolve();
                    },
                });
            });
        },
        compile(writer?: (name: string, content: Buffer) => void): Promise<any> {
            return new Promise((resolve, reject) => {
                let startCompilation = Date.now();
                let writtenFileCount = 0;
                if (!writer) mainServer.notifyCompilationStarted();
                compileProcess("compile", myId, {
                    log(param) { console.log(param) },
                    write({ name, buffer }) {
                        writtenFileCount++;
                        if (writer) writer(name, new Buffer(buffer, "binary"));
                        else writeToMemoryFs(name, new Buffer(buffer, "binary"));
                    },
                    compileOk(param) {
                        if (writer) {
                            resolve(param);
                            return;
                        }
                        let time = Date.now() - startCompilation;
                        mainServer.notifyCompilationFinished(param.errors, param.warnings, time, param.messages);
                        let message = "Compiled in " + time.toFixed(0) + "ms.";
                        if (param.errors > 0 || param.warnings > 0) {
                            message += " Found";
                            if (param.errors > 0) {
                                message += " " + param.errors + " error" + (param.errors !== 1 ? "s" : "");
                                if (param.warnings > 0)
                                    message += " and";
                            }
                            if (param.warnings > 0) {
                                message += " " + param.warnings + " warning" + (param.warnings !== 1 ? "s" : "");
                            }
                            message += ".";
                        }
                        if (writtenFileCount > 0) {
                            message += " Updated " + writtenFileCount + " file" + (writtenFileCount !== 1 ? "s" : "") + ".";
                        }
                        if (param.errors > 0) {
                            console.log(chalk.red(message));
                            notifier.notify({
                                title: 'BB - build failed',
                                message: message,
                                icon: path.join(bbDirRoot, 'assets/notify-icons/error.png'),
                                wait: true,
                                sticky: true
                            });
                        }
                        else {
                            console.log(chalk.green(message));
                            notifier.notify({
                                title: 'BB - build successfull',
                                message: message,
                                icon: path.join(bbDirRoot, 'assets/notify-icons/success.png')
                            });
                        }
                        resolve(param);
                    },
                    compileFailed(param) {
                        if (writer) {
                            reject(param);
                            return;
                        }
                        let time = Date.now() - startCompilation;
                        mainServer.notifyCompilationFinished(-1, 0, time, []);
                        console.log(param);
                        let message = "Compilation failed in " + time.toFixed(0) + "ms";
                        console.log(chalk.red(message));
                        notifier.notify({
                            title: 'BB - build critically failed',
                            message: message,
                            icon: path.join(bbDirRoot, 'assets/notify-icons/error.png'),
                            wait: true,
                            sticky: true
                        });
                        reject(param);
                    }
                });
            });
        }
    };
}
