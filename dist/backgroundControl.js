"use strict";
const childProcess = require('child_process');
const plugins = require("./pluginsLoader");
const bb = require('./index');
const chalk = require('chalk');
const notifier = require('node-notifier');
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
exports.bbDirRoot = path.dirname(__dirname.replace(/\\/g, "/"));
exports.testServer = new bb.TestServer();
exports.testServer.getSource = (loc) => {
    if (/\/bundle.js.map$/.test(loc))
        return exports.memoryFs["bundle.js.map"];
    return null;
};
exports.mainServer = new bb.MainServer(exports.testServer);
exports.memoryFs = Object.create(null);
function writeToMemoryFs(fn, b) {
    exports.memoryFs[fn.toLowerCase()] = b;
}
exports.writeToMemoryFs = writeToMemoryFs;
function startBackgroundProcess(name, callbacks) {
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
        }
        else {
            console.log(name + ":" + "unknown response command " + command + " with parameter " + JSON.stringify(param));
        }
    });
    child.on("exit", () => {
        if (typeof currentCallbacks["exit"] === "function") {
            currentCallbacks["exit"]();
        }
        else {
            console.log(name + ":" + "exited without anybody noticing");
        }
    });
    return (command, param, callbacks) => {
        Object.assign(currentCallbacks, callbacks);
        child.send({ command, param });
    };
}
exports.startBackgroundProcess = startBackgroundProcess;
let watchProcess = null;
function startWatchProcess(notify) {
    watchProcess = startBackgroundProcess("watch", {});
    let startWatchTime = Date.now();
    let prevPromise = Promise.resolve();
    let paths = ['**/*.ts?(x)', '**/package.json'];
    plugins.pluginsLoader.executeEntryMethod(plugins.EntryMethodType.updateWatchPaths, paths);
    watchProcess("watch", { cwd: bb.getCurProjectDir(), paths, filter: '\\.tsx?$', updateTsConfig: true }, {
        watchChange(param) {
            if (startWatchTime != 0) {
                console.log("Watching ready in " + (Date.now() - startWatchTime).toFixed(0) + "ms");
                startWatchTime = 0;
            }
            prevPromise.then(() => {
                prevPromise = notify(param);
            });
        },
        exit() {
            console.log("watch process exited restarting");
            startWatchProcess(notify);
        }
    });
}
exports.startWatchProcess = startWatchProcess;
let lastId = 0;
function startCompileProcess(compilationPath) {
    let compileProcess = startBackgroundProcess("compile", {});
    let myId = "" + (lastId++);
    compileProcess("createProject", { id: myId, dir: compilationPath });
    return {
        stop() {
            compileProcess("disposeProject", myId, { exit() { } });
        },
        refresh(allFiles) {
            return new Promise((resolve, reject) => {
                compileProcess("refreshProject", { id: myId, allFiles }, {
                    log(param) { console.log(param); },
                    refreshed(param) {
                        if (param)
                            resolve();
                        else
                            reject(new Error("Refresh failed"));
                    },
                });
            });
        },
        setOptions(options) {
            return new Promise((resolve, reject) => {
                compileProcess("setProjectOptions", { id: myId, options }, {
                    log(param) { console.log(param); },
                    options(param) {
                        resolve(param);
                    },
                });
            });
        },
        installDependencies() {
            return new Promise((resolve, reject) => {
                compileProcess("installDependencies", { id: myId }, {
                    log(param) { console.log(param); },
                    finished(param) {
                        resolve(param);
                    },
                });
            });
        },
        callPlugins(method) {
            return new Promise((resolve, reject) => {
                compileProcess("callPlugins", { id: myId, method: method }, {
                    log(param) { console.log(param); },
                    finished(param) {
                        resolve(param);
                    },
                });
            });
        },
        loadTranslations() {
            return new Promise((resolve, reject) => {
                compileProcess("loadTranslations", myId, {
                    log(param) { console.log(param); },
                    loaded() {
                        resolve();
                    },
                });
            });
        },
        compile(writer) {
            return new Promise((resolve, reject) => {
                let startCompilation = Date.now();
                let writtenFileCount = 0;
                if (!writer)
                    exports.mainServer.notifyCompilationStarted();
                compileProcess("compile", myId, {
                    log(param) { console.log(param); },
                    write({ name, buffer }) {
                        writtenFileCount++;
                        if (writer)
                            writer(name, new Buffer(buffer, "binary"));
                        else
                            writeToMemoryFs(name, new Buffer(buffer, "binary"));
                    },
                    compileOk(param) {
                        if (writer) {
                            resolve(param);
                            return;
                        }
                        let time = Date.now() - startCompilation;
                        exports.mainServer.notifyCompilationFinished(param.errors, param.warnings, time, param.messages);
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
                                icon: path.join(exports.bbDirRoot, 'assets/notify-icons/error.png'),
                                wait: true,
                                sticky: true
                            });
                        }
                        else {
                            console.log(chalk.green(message));
                            notifier.notify({
                                title: 'BB - build successfull',
                                message: message,
                                icon: path.join(exports.bbDirRoot, 'assets/notify-icons/success.png')
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
                        exports.mainServer.notifyCompilationFinished(-1, 0, time, []);
                        console.log(param);
                        let message = "Compilation failed in " + time.toFixed(0) + "ms";
                        console.log(chalk.red(message));
                        notifier.notify({
                            title: 'BB - build critically failed',
                            message: message,
                            icon: path.join(exports.bbDirRoot, 'assets/notify-icons/error.png'),
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
exports.startCompileProcess = startCompileProcess;
//# sourceMappingURL=backgroundControl.js.map