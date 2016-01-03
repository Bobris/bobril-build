import * as c from 'commander';
import * as ts from 'typescript';
import * as bb from '../index';
import * as http from 'http';
import * as childProcess from 'child_process';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";

var memoryFs: { [name: string]: Buffer } = Object.create(null);

var project: bb.IProject;

function write(fn: string, b: Buffer) {
    memoryFs[fn] = b;
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
    console.log('Req ' + request.url);
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
        if (reUrlTest.test(name)) {
            if (request.url.length === 4) {
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
    let f = memoryFs[request.url.substr(1)];
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
    let child = childProcess.fork(path.dirname(__dirname.replace(/\\/g, "/")) + "/cli", ["background"]);
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
            console.log("watch process exited");
        }
    });
}

interface ICompileProcess {
    refresh(allFiles: { [dir: string]: string[] }): Promise<any>;
    setOptions(options: any): Promise<any>;
    loadTranslations(): Promise<any>;
    compile(): Promise<any>;
    stop(): void;
}

let lastId = 0;
function startCompileProcess(path: string): ICompileProcess {
    let compileProcess = startBackgroundProcess("compile", {});
    let myId = "" + (lastId++);
    compileProcess("createProject", { id: myId, dir: path });
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
                compileProcess("compile", myId, {
                    log(param) { console.log(param) },
                    write({ name, buffer }) {
                        writtenFileCount++;
                        console.log(name);
                        write(name, new Buffer(buffer, "binary"));
                    },
                    compileOk() {
                        console.log("Compiled in " + (Date.now() - startCompilation).toFixed(0) + "ms. Updated " + writtenFileCount + " file" + (writtenFileCount !== 1 ? "s" : "") + ".");
                        resolve();
                    },
                    compileFailed(param) {
                        console.log(param);
                        console.log("Compilation failed in " + (Date.now() - startCompilation).toFixed(0) + "ms");
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

function interactiveCommand(port: number = 8080) {
    var server = http.createServer(handleRequest);
    server.listen(port, function() {
        console.log("Server listening on: http://localhost:" + port);
    });
    let compileProcess = startCompileProcess(curProjectDir);
    compileProcess.refresh(null).then(() => {
        return compileProcess.setOptions(getDefaultDebugOptions());
    }).then((opts) => {
        return compileProcess.loadTranslations();
    }).then((opts) => {
        startWatchProcess((allFiles: { [dir: string]: string[] }) => {
            compileProcess.refresh(allFiles).then(() => compileProcess.compile());
        });
    });
}

export function run() {
    let commandRunning = false;
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
        .option("-l, --localize <1/0>", "create localized resources (default autodetect)", /^(true|false|1|0|t|f|y|n)$/i, "")
        .action((c) => {
            commandRunning = true;
            let project = bb.createProjectFromDir(curProjectDir);
            project.logCallback = (text) => {
                console.log(text);
            }
            if (!bb.refreshProjectFromPackageJson(project, null)) {
                process.exit(1);
            }
            if (c["dir"]) project.outputDir = c["dir"];
            if (humanTrue(c["fast"])) {
                presetDebugProject(project);
            } else {
                presetReleaseProject(project);
                project.compress = humanTrue(c["compress"]);
                project.mangle = humanTrue(c["mangle"]);
                project.beautify = humanTrue(c["beautify"]);
            }
            if (c["localize"]) {
                project.localize = humanTrue(c["localize"]);
            }
            if (!project.outputDir) {
                project.outputDir = "./dist";
            }
            console.time("compile");
            bb.compileProject(project).then(() => {
                console.timeEnd("compile");
                process.exit(0);
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
            process.exit(0);
        });
    c
        .command("test")
        .description("runs tests once in PhantomJs")
        .action((c) => {
            commandRunning = true;
            var server = http.createServer(handleRequest);
            server.listen(0, function() {
                console.log("Server listening on: http://localhost:" + server.address().port);
            });
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
                let p = bb.startPhantomJs([require.resolve('./phantomjsOpen.js'), `http://localhost:${server.address().port}/bb/test/`]);
                testServer.startTest('/test.html');
                return Promise.race<number | bb.TestResultsHolder>([p.finish, testServer.waitForOneResult()]);
            }).then((code: number | bb.TestResultsHolder) => {
                if (typeof code === "number") {
                    console.log('phantom code:' + code);
                    process.exit(1);
                } else if (code == null) {
                    console.log('test timeout on start');
                    process.exit(1);
                } else {
                    console.log(code);
                    if (code.failure)
                        process.exit(1);
                    else
                        process.exit(0);
                }
            }, (err) => {
                console.error(err);
                process.exit(1);
            });
        });
    c
        .command("interactive")
        .alias("i")
        .option("-p, --port <port>", "set port for server to listen to (default 8080)")
        .description("runs web controled build ui")
        .action((c) => {
            commandRunning = true;
            interactiveCommand(c["port"]);
        });
    c.command('*', null, { noHelp: true }).action((com) => {
        console.log("Invalid command " + com);
    });
    c.parse(process.argv);
    if (!commandRunning) {
        interactiveCommand(c["port"]);
    }
}
