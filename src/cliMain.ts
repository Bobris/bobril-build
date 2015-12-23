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
var browserControl = new bb.BrowserControl();

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
const distWebRoot = path.dirname(__dirname.replace(/\\/g, "/")) + "/distweb";
function handleRequest(request: http.ServerRequest, response: http.ServerResponse) {
    //console.log('Req ' + request.url);
    if (reUrlBB.test(request.url)) {
        if (request.url.length===3) {
            response.writeHead(301, { Location: "/bb/" });
            response.end();
            return;
        }
        let name = request.url.substr(4);
        if (name.length === 0) name = 'index.html';
        let contentStream = <fs.ReadStream>fs.createReadStream(distWebRoot + "/" + name)
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

function startWatchProcess(notify: () => void) {
    watchProcess = startBackgroundProcess("watch", {});
    let startWatchTime = Date.now();
    watchProcess("watch", { paths: ['**/*.ts', '**/tsconfig.json', '**/package.json'] }, {
        watchReady() {
            console.log("Watching ready in " + (Date.now() - startWatchTime).toFixed(0) + "ms");
        },
        watchChange() {
            notify();
        },
        exit() {
            console.log("watch process exited");
        }
    });
}

interface ICompileProcess {
    refresh(): Promise<any>;
    setOptions(options: any): Promise<any>;
    loadTranslations(): Promise<any>;
    compile(): Promise<any>;
    stop(): void;
}

let lastId = 0;
function startCompileProcess(path: string): ICompileProcess {
    let compileProcess = startBackgroundProcess("compile", {});
    let myId = ""+(lastId++);
    compileProcess("createProject", { id: myId, dir: path });
    return {
        stop() {
            compileProcess("disposeProject", myId, { exit() { } });
        },
        refresh():Promise<any> {
            return new Promise((resolve, reject) => {
                compileProcess("refreshProject", myId, {
                    log(param) { console.log(param) },
                    refreshed(param: boolean) {
                        if (param) resolve(); else reject(new Error("Refresh failed"));
                    },
                });
            });
        },
        setOptions(options: any):Promise<any> {
            return new Promise((resolve, reject) => {
                compileProcess("setProjectOptions", { id: myId, options }, {
                    log(param) { console.log(param) },
                    options(param: any) {
                        resolve(param);
                    },
                });
            });
        },
        loadTranslations():Promise<any> {
            return new Promise((resolve, reject) => {
                compileProcess("loadTranslations", myId, {
                    log(param) { console.log(param) },
                    loaded() {
                        resolve();
                    },
                });
            });
        },
        compile():Promise<any> {
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
                        console.log("Compiled in " + (Date.now() - startCompilation).toFixed(0) + "ms. Updated "+writtenFileCount+" file"+(writtenFileCount!==1?"s":"")+".");
                        resolve();
                    },
                    compileFailed(param) {
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
        totalBundle: false,
        compress: false,
        mangle: false,
        beautify: true,
        defines: { DEBUG: true }
    };
}

function interactiveCommand(port:number = 8080) {
    var server = http.createServer(handleRequest);
    server.listen(port, function() {
        console.log("Server listening on: http://localhost:" + port);
    });
    let compileProcess = startCompileProcess(bb.currentDirectory());
    compileProcess.refresh().then(()=>{
        return compileProcess.setOptions(getDefaultDebugOptions());
    }).then((opts)=>{
        return compileProcess.loadTranslations();
    }).then((opts)=>{
        return compileProcess.compile();
    });
    //browserControl.start(6666, 'chrome', 'http://localhost:8080');
    startWatchProcess(() => {
        compileProcess.refresh().then(()=>compileProcess.compile());
        /*
        compileProcess.compile().then(() => {
            let scriptUrl = browserControl.listScriptUrls()[0];
            let scriptId = browserControl.getScriptIdFromUrl(scriptUrl);
            browserControl.setScriptSource(scriptId, memoryFs["bundle.js"].toString()).then(() => {
                browserControl.evaluate("b.invalidateStyles();b.ignoreShouldChange();");
            });
        });*/
    });
}

export function run() {
    let commandRunning = false;
    c
        .command("build")
        .alias("b")
        .description("just build and stop")
        .option("-d, --dir <outputdir>", "define where to put build result (default is ./dist)")
        .option("-c, --compress <1/0>", "remove dead code", /^(true|false|1|0|t|f|y|n)$/i, "1")
        .option("-m, --mangle <1/0>", "minify names", /^(true|false|1|0|t|f|y|n)$/i, "1")
        .option("-b, --beautify <1/0>", "readable formatting", /^(true|false|1|0|t|f|y|n)$/i, "0")
        .option("-l, --localize <1/0>", "create localized resources (default autodetect)", /^(true|false|1|0|t|f|y|n)$/i, "")
        .action((c) => {
            commandRunning = true;
            let project = bb.createProjectFromDir(bb.currentDirectory());
            project.logCallback = (text) => {
                console.log(text);
            }
            if (!bb.refreshProjectFromPackageJson(project)) {
                process.exit(1);
            }
            presetReleaseProject(project);
            if (c["dir"]) project.outputDir = c["dir"];
            project.compress = humanTrue(c["compress"]);
            project.mangle = humanTrue(c["mangle"]);
            project.beautify = humanTrue(c["beautify"]);
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
        .action((c)=> {
            commandRunning = true;
            let project = bb.createProjectFromDir(bb.currentDirectory());
            let trDir = path.join(project.dir, "translations");
            let trDb = new bb.TranslationDb();
            trDb.loadLangDbs(trDir);
            if (c["addlang"]) {
                console.log("Adding locale "+c["addlang"]);
                trDb.addLang(c["addlang"]);
                trDb.saveLangDbs(trDir);
            }
            if (c["removelang"]) {
                console.log("Removing locale "+c["removelang"]);
                trDb.removeLang(c["removelang"]);
                trDb.saveLangDbs(trDir);
            }
            process.exit(0);
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
        interactiveCommand();
    }
}
