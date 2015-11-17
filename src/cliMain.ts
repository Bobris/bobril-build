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
    console.log('Memory write ' + fn);
    memoryFs[fn] = b;
}

function writeDist(fn: string, b: Buffer) {
    let ofn = path.join('dist', fn);
    console.log('Writting ' + ofn);
    memoryFs[fn] = b;
    bb.mkpathsync(path.dirname(ofn));
    fs.writeFileSync(ofn, b);
}

function handleRequest(request: http.ServerRequest, response: http.ServerResponse) {
    //console.log('Req ' + request.url);
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
    project.writeFileCallback = write;
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
    project.writeFileCallback = writeDist;
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
    project.writeFileCallback = writeDist;
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
    compile(): Promise<any>;
    stop(): void;
}

function startCompileProcess(project: bb.IProject): ICompileProcess {
    let compileProcess = startBackgroundProcess("compile", {});
    compileProcess("initProject", { project });
    return {
        stop() {
            compileProcess("stop", null, { exit() { } });
        },
        compile() {
            return new Promise((resolve, reject) => {
                let startCompilation = Date.now();
                compileProcess("compile", null, {
                    log(param) { console.log("Compilation:" + param) },
                    write({ name, buffer }) {
                        write(name, new Buffer(buffer, "binary"));
                    },
                    compileOk() {
                        console.log("Compiled in " + (Date.now() - startCompilation).toFixed(0) + "ms");
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

export function run() {
    project = createProjectFromPackageJson();
    if (project == null) return;
    presetLiveReloadProject(project);

    let compileProcess = startCompileProcess(project);
    compileProcess.compile().then(() => {
        var server = http.createServer(handleRequest);
        server.listen(8080, function() {
            console.log("Server listening on: http://localhost:8080");
            browserControl.start(6666, 'chrome', 'http://localhost:8080');
        });
    });
    startWatchProcess(() => {
        compileProcess.compile().then(() => {
            let scriptUrl = browserControl.listScriptUrls()[0];
            let scriptId = browserControl.getScriptIdFromUrl(scriptUrl);
            browserControl.setScriptSource(scriptId, memoryFs["bundle.js"].toString()).then(() => {
                browserControl.evaluate("b.invalidateStyles();b.ignoreShouldChange();");
            });
        });
    });
}

