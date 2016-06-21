import * as c from 'commander';
import * as ts from 'typescript';
import * as bb from './index';
import * as http from 'http';
import * as childProcess from 'child_process';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";
import * as plugins from "./pluginsLoader"
import * as depChecker from "./dependenciesChecker"
import {AdditionalResources}  from './additionalResources'
import * as chalk from 'chalk';
import * as notifier from 'node-notifier';

var memoryFs: { [name: string]: Buffer } = Object.create(null);

var serverAdditionalResources: AdditionalResources;
var serverProject: bb.IProject;

function write(fn: string, b: Buffer) {
    memoryFs[fn.toLowerCase()] = b;
}

function writeDist(fn: string, b: Buffer) {
    let ofn = path.join('dist', fn);
    console.log('Writting ' + ofn);
    memoryFs[fn] = b;
    bb.mkpathsync(path.dirname(ofn));
    fs.writeFileSync(ofn, b);
}

const reUrlBB = /^\/bb(?:$|\/)/;
const reUrlTest = /^test(?:$|\/)/;
const bbDirRoot = path.dirname(__dirname.replace(/\\/g, "/"));
const distWebRoot = bbDirRoot + "/distweb";
const distWebtRoot = bbDirRoot + "/distwebt";
let curProjectDir: string;
let testServer = new bb.TestServer();

testServer.getSource = (loc: string) => {
    if (/\/bundle.js.map$/.test(loc))
        return memoryFs["bundle.js.map"];
    return null;
}
let mainServer = new bb.MainServer(testServer);
let server: http.Server = null;
let phantomJsProcess: bb.IProcess = null;

function startTestsInPhantom() {
    phantomJsProcess = bb.startPhantomJs([require.resolve('./phantomjsOpen.js'), `http://localhost:${server.address().port}/bb/test/`]);
}

function fileResponse(response: http.ServerResponse, name: string) {
    let contentStream = <fs.ReadStream>fs.createReadStream(name)
        .on("open",
        function handleContentReadStreamOpen() {
            contentStream.pipe(response);
        }
        )
        .on("error",
        function handleContentReadStreamError(error) {
            try {
                response.setHeader("Content-Length", "0");
                response.setHeader("Cache-Control", "max-age=0");
                response.writeHead(500, "Server Error");
            } catch (headerError) {
                // We can't set a header once the headers have already
                // been sent - catch failed attempt to overwrite the
                // response code.
            } finally {
                response.end("500 Server Error");
            }
        }
        );
}

let specialFiles: { [name: string]: string | Buffer } = Object.create(null);

import * as pathUtils from './pathUtils';

specialFiles["loader.js"] = require.resolve("./loader.js");
specialFiles["jasmine-core.js"] = path.join(pathUtils.dirOfNodeModule("jasmine-core"), 'jasmine-core/jasmine.js');
specialFiles["jasmine-boot.js"] = require.resolve("./jasmine-boot.js");

function respondSpecial(response: http.ServerResponse, name: string) {
    let c = specialFiles[name];
    if (c == null) {
        console.log(`Respond Special not found ${name}`);
        response.statusCode = 404;
        response.end("Not found");
        return;
    }
    if (typeof c === "string") {
        c = fs.readFileSync(c as string);
        specialFiles[name] = c;
    }
    response.end(c);
}

function handleRequest(request: http.ServerRequest, response: http.ServerResponse) {
    // console.log('Req ' + request.url);
    if (reUrlBB.test(request.url)) {
        if (request.url.length === 3) {
            response.writeHead(301, { Location: "/bb/" });
            response.end();
            return;
        }
        let name = request.url.substr(4);
        if (name === 'api/test') {
            testServer.handle(request, response);
            return;
        }
        if (name === 'api/main') {
            mainServer.handle(request, response);
            return;
        }
        if (name === 'api/projectdirectory') {
            let project = initServerProject();
            response.end(project.dir);
            return;
        }
        if (reUrlTest.test(name)) {
            if (name.length === 4) {
                response.writeHead(301, { Location: "/bb/test/" });
                response.end();
                return;
            }
            name = name.substr(5);
            if (name.length === 0) name = 'index.html';
            fileResponse(response, distWebtRoot + "/" + name);
            return;
        }
        if (name.length === 0) name = 'index.html';
        if (/^base\//.test(name)) {
            fileResponse(response, curProjectDir + name.substr(4));
            return;
        }
        if (/^special\//.test(name)) {
            name = name.substr(8);
            respondSpecial(response, name);
            return;
        }
        fileResponse(response, distWebRoot + "/" + name);
        return;
    }
    if (request.url === '/') {
        response.end(memoryFs['index.html']);
        return;
    }
    let f = memoryFs[request.url.substr(1).toLowerCase()];
    if (f) {
        response.end(f);
        return;
    }
    if (serverAdditionalResources == null)
        serverAdditionalResources = createAdditionalResources(initServerProject());
    f = serverAdditionalResources.tryGetFileContent(request.url.substr(1));
    if (f) {
        response.end(f);
        return;
    }

    response.statusCode = 404;
    response.end('Not found');
}

function autodetectMainTs(project: bb.IProject): bb.IProject {
    const searchMainTsList = ['index.ts', 'app.ts', 'lib.ts', 'src/index.ts', 'src/app.ts', 'src/lib.ts'];
    for (let i = 0; i < searchMainTsList.length; i++) {
        let fn = searchMainTsList[i];
        if (fs.existsSync(fn)) {
            project.main = fn;
            console.log('Detected main ' + fn);
            project.mainJsFile = fn.replace(/\.ts$/, '.js');
            return project;
        }
    }
    console.log('Error: Main not found. Searched: ' + searchMainTsList.join(', '));
    return null;
}

function createProjectFromPackageJson(): bb.IProject {
    let project: bb.IProject = {
        dir: process.cwd().replace(/\\/g, '/'),
        main: 'src/app.ts',
        mainJsFile: 'src/app.js',
        mainExamples: [],
        options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5, skipDefaultLibCheck: true }
    };
    let packageJson = null;
    try {
        packageJson = fs.readFileSync('package.json', 'utf-8');
    } catch (err) {
        console.log('Cannot read package.json ' + err + '. Autodetecting main ts file.');
        return autodetectMainTs(project);
    }
    let packageObj = null;
    try {
        packageObj = JSON.parse(packageJson);
    } catch (err) {
        console.log('Package.json cannot be parsed. ' + err);
        return null;
    }
    if (packageObj.typescript && typeof packageObj.typescript.main === 'string') {
        let main = packageObj.typescript.main;
        if (!fs.existsSync(main)) {
            console.log('Package.json typescript.main is ' + main + ', but this file does not exists. Aborting.');
            return null;
        }
        project.main = main;
        project.mainJsFile = main.replace(/\.ts$/, '.js');
    } else {
        console.log('Package.json missing typescript.main. Autodetecting main ts file.');
        project = autodetectMainTs(project);
        if (project == null) return null;
    }
    let bobrilSection = packageObj.bobril;
    if (bobrilSection == null) return project;
    if (typeof bobrilSection.title === 'string') {
        project.htmlTitle = bobrilSection.title;
    }
    if (typeof bobrilSection.dir === 'string') {
        project.outputDir = bobrilSection.dir;
    }
    return project;
}

function presetDebugProject(project: bb.IProject) {
    project.debugStyleDefs = true;
    project.releaseStyleDefs = false;
    project.spriteMerge = false;
    project.fastBundle = true;
    project.totalBundle = false;
    project.compress = false;
    project.mangle = false;
    project.beautify = true;
    project.defines = { DEBUG: true };
}

function presetLiveReloadProject(project: bb.IProject) {
    project.liveReloadStyleDefs = true;
    project.debugStyleDefs = true;
    project.releaseStyleDefs = false;
    project.spriteMerge = false;
    project.totalBundle = true;
    project.compress = false;
    project.mangle = false;
    project.beautify = true;
    project.defines = { DEBUG: true };
}

function presetReleaseProject(project: bb.IProject) {
    project.debugStyleDefs = false;
    project.releaseStyleDefs = true;
    project.spriteMerge = true;
    project.totalBundle = true;
    project.compress = true;
    project.mangle = true;
    project.beautify = false;
    project.defines = { DEBUG: false };
}

function startBackgroundProcess(name: string, callbacks: {}): (command: string, param?: any, callbacks?: {}) => void {
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

function startWatchProcess(notify: (allFiles: { [dir: string]: string[] }) => void) {
    watchProcess = startBackgroundProcess("watch", {});
    let startWatchTime = Date.now();
    watchProcess("watch", { cwd: curProjectDir, paths: ['**/*.ts?(x)', '**/package.json'], filter: '\\.tsx?$', updateTsConfig: true }, {
        watchChange(param: { [dir: string]: string[] }) {
            if (startWatchTime != 0) {
                console.log("Watching ready in " + (Date.now() - startWatchTime).toFixed(0) + "ms");
                startWatchTime = 0;
            }
            notify(param);
        },
        exit() {
            console.log("watch process exited restarting");
            startWatchProcess(notify);
        }
    });
}

interface ICompileProcess {
    refresh(allFiles: { [dir: string]: string[] }): Promise<any>;
    setOptions(options: any): Promise<bb.IProject>;
    callPlugins(method: plugins.EntryMethodType): Promise<any>;
    loadTranslations(): Promise<any>;
    installDependencies(): Promise<any>;
    compile(): Promise<{ hasTests: boolean }>;
    stop(): void;
}

let lastId = 0;
function startCompileProcess(compilationPath: string): ICompileProcess {
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
        compile(): Promise<any> {
            return new Promise((resolve, reject) => {
                let startCompilation = Date.now();
                let writtenFileCount = 0;
                mainServer.nofifyCompilationStarted();
                compileProcess("compile", myId, {
                    log(param) { console.log(param) },
                    write({ name, buffer }) {
                        writtenFileCount++;
                        //console.log(name);
                        write(name, new Buffer(buffer, "binary"));
                    },
                    compileOk(param) {
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

function humanTrue(val: string): boolean {
    return /^(true|1|t|y)$/i.test(val);
}

function getDefaultDebugOptions() {
    return {
        debugStyleDefs: true,
        releaseStyleDefs: false,
        spriteMerge: false,
        fastBundle: true,
        totalBundle: false,
        compress: false,
        mangle: false,
        beautify: true,
        defines: { DEBUG: true }
    };
}

function startHttpServer(port: number) {
    server = http.createServer(handleRequest);
    server.on("listening", function () {
        console.log("Server listening on: " + chalk.cyan(" http://localhost:" + server.address().port));
    });
    server.on('error', function (e) {
        if (e.code == 'EADDRINUSE') {
            setTimeout(function () {
                server.close();
                server.listen({ port: 0, exclusive: true });
            }, 10);
        }
    });
    server.listen({ port, exclusive: true });
}

function interactiveCommand(port: number) {
    mainServer.setProjectDir(curProjectDir);
    startHttpServer(port);
    let compileProcess = startCompileProcess(curProjectDir);
    compileProcess.refresh(null).then(() => {
        return compileProcess.setOptions(getDefaultDebugOptions());
    }).then((opts) => {
        return compileProcess.installDependencies().then(()=>opts);
    }).then((opts) => {
        return compileProcess.callPlugins(plugins.EntryMethodType.afterStartCompileProcess);
    }).then((opts) => {
        return compileProcess.loadTranslations();
    }).then((opts) => {
        startWatchProcess((allFiles: { [dir: string]: string[] }) => {
            compileProcess.refresh(allFiles).then(() => compileProcess.compile()).then(v => {
                if (v.hasTests) {
                    if (phantomJsProcess == null)
                        startTestsInPhantom();
                    testServer.startTest('/test.html');
                }
            });
        });
    });
}

function initServerProject(): bb.IProject {
    if (serverProject) return serverProject;
    serverProject = bb.createProjectFromDir(curProjectDir);
    serverProject.logCallback = (text) => {
        console.log(text);
    }
    if (!bb.refreshProjectFromPackageJson(serverProject, null)) {
        process.exit(1);
    }
    return serverProject;
}

function createAdditionalResources(project: bb.IProject) {
    return new AdditionalResources(project);
}

export function run() {
    let commandRunning = false;
    let range = [];
    curProjectDir = bb.currentDirectory();
    c
        .command("build")
        .alias("b")
        .description("just build and stop")
        .option("-d, --dir <outputdir>", "define where to put build result (default is ./dist)")
        .option("-f, --fast <1/0>", "quick debuggable bundling", /^(true|false|1|0|t|f|y|n)$/i, "0")
        .option("-c, --compress <1/0>", "remove dead code", /^(true|false|1|0|t|f|y|n)$/i, "1")
        .option("-m, --mangle <1/0>", "minify names", /^(true|false|1|0|t|f|y|n)$/i, "1")
        .option("-b, --beautify <1/0>", "readable formatting", /^(true|false|1|0|t|f|y|n)$/i, "0")
        .option("-s, --style <0/1/2>", "override styleDef className preservation level", /^(0|1|2)$/, "")
        .option("-p, --sprite <0/1>", "enable/disable creation of sprites")
        .option("-l, --localize <1/0>", "create localized resources (default autodetect)", /^(true|false|1|0|t|f|y|n)$/i, "")
        .option("-u, --updateTranslations <1/0>", "update translations", /^(true|false|1|0|t|f|y|n)$/i, "0")
        .option("-v, --versiondir <name>", "store all resouces except index.html in this directory")
        .action((c) => {
            commandRunning = true;
            let start = Date.now();
            let project = bb.createProjectFromDir(curProjectDir);
            project.logCallback = (text) => {
                console.log(text);
            }
            if (!bb.refreshProjectFromPackageJson(project, null)) {
                process.exit(1);
            }
            project.updateTranslations = humanTrue(c["updateTranslations"]);
            if (c["dir"]) project.outputDir = c["dir"];
            if (humanTrue(c["fast"]) || project.mainExamples.length > 1) {
                presetDebugProject(project);
                if (!humanTrue(c["fast"])) {
                    project.spriteMerge = true;
                }
            } else {
                presetReleaseProject(project);
                project.compress = humanTrue(c["compress"]);
                project.mangle = humanTrue(c["mangle"]);
                project.beautify = humanTrue(c["beautify"]);
            }
            switch (c["style"]) {
                case "0": {
                    project.debugStyleDefs = false;
                    project.releaseStyleDefs = true;
                    break;
                }
                case "1": {
                    project.debugStyleDefs = false;
                    project.releaseStyleDefs = false;
                    break;
                }
                case "2": {
                    project.debugStyleDefs = true;
                    project.releaseStyleDefs = false;
                    break;
                }
            }
            if (c["localize"]) {
                project.localize = humanTrue(c["localize"]);
            }
            if (c["versiondir"]) {
                project.outputSubDir = c["versiondir"];
            }
            if (!project.outputDir) {
                project.outputDir = "./dist";
            }
            if (c["sprite"]) {
                project.spriteMerge = humanTrue(c["sprite"]);
            }
            if (project.fastBundle) {
                project.options.sourceRoot = path.relative(project.outputDir, ".");
            }
            if (!depChecker.installMissingDependencies(project))
                process.exit(1);
            bb.compileProject(project).then((result: bb.CompilationResult) => {
                if (result.errors == 0 && createAdditionalResources(project).copyFilesToOuputDir()) {
                    console.log(chalk.green("Build finished succesfully with " + result.warnings + " warnings in " + (Date.now() - start).toFixed(0) + " ms"));
                    process.exit(0);
                }
                console.error(chalk.red("There was " + result.errors + " errors during build"));
                process.exit(1);
            }, (err) => {
                console.error(err);
                process.exit(1);
            });
        });
    c
        .command("translation")
        .alias("t")
        .description("everything around translations")
        .option("-a, --addlang <lang>", "add new language")
        .option("-r, --removelang <lang>", "remove language")
        .option("-e, --export <path>", "export untranslated languages")
        .option("-i, --import <path>", "import translated languages")
        .option("-u, --union <sourcePath1,sourcePath2,destinationPath>", "make union from paths")
        .option("-s, --subtract <sourcePath1,sourcePath2,destinationPath>", "make subtract of paths")
        .action((c) => {
            commandRunning = true;
            let project = bb.createProjectFromDir(bb.currentDirectory());
            let trDir = path.join(project.dir, "translations");
            let trDb = new bb.TranslationDb();
            trDb.loadLangDbs(trDir);
            if (c["addlang"]) {
                console.log("Adding locale " + c["addlang"]);
                trDb.addLang(c["addlang"]);
                trDb.saveLangDbs(trDir);
            }
            if (c["removelang"]) {
                console.log("Removing locale " + c["removelang"]);
                trDb.removeLang(c["removelang"]);
                trDb.saveLangDbs(trDir);
            }
            if (c["export"]) {
                console.log("Export untranslated languages into file " + c["export"] + ".");
                if (!trDb.exportUntranslatedLanguages(c["export"]))
                    process.exit(1);
            }
            if (c["import"]) {
                console.log("Import translated languages from file " + c["import"] + ".");
                console.log("------loaded db", trDb)
                if (!trDb.importTranslatedLanguages(c["import"]))
                    process.exit(1);
                trDb.saveLangDbs(trDir,true);
            }
            if (c["union"]) {
                let uArgs = c["union"].split(',');
                if (uArgs.length != 3) {
                    console.log("Invalid count of parameters.")
                    process.exit(1);
                }
                if (!trDb.makeUnionOfExportedLanguages(uArgs[0], uArgs[1], uArgs[2]))
                    process.exit(1);
            }
            if (c["subtract"]) {
                let uArgs = c["subtract"].split(',');
                if (uArgs.length != 3) {
                    console.log("Invalid count of parameters.")
                    process.exit(1);
                }
                if (!trDb.makeSubtractOfExportedLanguages(uArgs[0], uArgs[1], uArgs[2]))
                    process.exit(1);
            }
            process.exit(0);
        });
    c
        .command("test")
        .description("runs tests once in PhantomJs")
        .option("-o, --out <name>", "filename for test result as JUnit XML")
        .action((c) => {
            commandRunning = true;
            startHttpServer(0);
            console.time("compile");
            let project = bb.createProjectFromDir(curProjectDir);
            project.logCallback = (text) => {
                console.log(text);
            }
            if (!bb.refreshProjectFromPackageJson(project, null)) {
                process.exit(1);
            }
            var compilationCache = new bb.CompilationCache();
            bb.fillMainSpec(project).then(() => {
                presetDebugProject(project);
                project.updateTranslations = false;
                project.options.sourceRoot = "/";
                project.fastBundle = true;
                project.main = project.mainSpec;
                project.writeFileCallback = write;
                var translationDb = new bb.TranslationDb();
                bb.defineTranslationReporter(project);
                let trDir = path.join(project.dir, "translations");
                if (project.localize) {
                    translationDb.loadLangDbs(trDir);
                    project.compileTranslation = translationDb;
                }
                translationDb.clearBeforeCompilation();
                compilationCache.clearFileTimeModifications();
                return compilationCache.compile(project);
            }).then(() => {
                bb.updateTestHtml(project);
                console.timeEnd("compile");
                let result = compilationCache.getResult();
                if (result.errors != 0) {
                    console.log(chalk.red("Skipping testing due to " + result.errors + " errors in build."));
                    process.exit(1);
                }
                console.log(chalk.green("Build finished with " + result.warnings + " warnings. Starting tests."));
                startTestsInPhantom();
                testServer.startTest('/test.html');
                return Promise.race<number | bb.TestResultsHolder>([phantomJsProcess.finish, testServer.waitForOneResult()]);
            }).then((code: number | bb.TestResultsHolder) => {
                if (typeof code === "number") {
                    console.log('phantom result code:' + code);
                    process.exit(1);
                } else if (code == null) {
                    console.log('test timeout on start');
                    process.exit(1);
                } else {
                    if (c["out"]) {
                        fs.writeFileSync(c["out"], bb.toJUnitXml(code));
                    }
                    if (code.failure) {
                        console.log(chalk.red(code.totalTests + " tests finished with " + code.testsFailed + " failures."));
                        process.exit(1);
                    }
                    else {
                        console.log(chalk.green(code.totalTests + " tests finished without failures."));
                        process.exit(0);
                    }
                }
            }, (err) => {
                console.error(err);
                process.exit(1);
            });
        });
    c
        .command("interactive")
        .alias("i")
        .option("-p, --port <port>", "set port for server to listen to (default 8080)", 8080)
        .option("-l, --localize <1/0>", "create localized resources (default autodetect)", /^(true|false|1|0|t|f|y|n)$/i, "")
        .description("runs web controled build ui")
        .action((c) => {
            let project = bb.createProjectFromDir(curProjectDir);
            if (c["localize"]) {
                project.localize = humanTrue(c["localize"]);
            }
            commandRunning = true;
            interactiveCommand(c["port"]);
        });
    c.command('*', null, { noHelp: true }).action((com) => {
        console.log("Invalid command " + com);
    });

    plugins.pluginsLoader.registerCommands(c, function () { commandRunning = true });
    plugins.pluginsLoader.executeEntryMethod(plugins.EntryMethodType.registerCommands, c, bb, function () {
        commandRunning = true;
    });
    depChecker.registerCommands(c, function () { commandRunning = true })

    let res = c.parse(process.argv);
    if (!commandRunning) {
        interactiveCommand(8080);
    }
}
