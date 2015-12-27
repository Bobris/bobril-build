"use strict";
var c = require('commander');
var ts = require('typescript');
var bb = require('../index');
var http = require('http');
var childProcess = require('child_process');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require("fs");
var memoryFs = Object.create(null);
var project;
var browserControl = new bb.BrowserControl();
function write(fn, b) {
    memoryFs[fn] = b;
}
function writeDist(fn, b) {
    var ofn = path.join('dist', fn);
    console.log('Writting ' + ofn);
    memoryFs[fn] = b;
    bb.mkpathsync(path.dirname(ofn));
    fs.writeFileSync(ofn, b);
}
var reUrlBB = /^\/bb(?:$|\/)/;
var distWebRoot = path.dirname(__dirname.replace(/\\/g, "/")) + "/distweb";
var curProjectDir;
function fileResponse(response, name) {
    var contentStream = fs.createReadStream(name)
        .on("open", function handleContentReadStreamOpen() {
        contentStream.pipe(response);
    })
        .on("error", function handleContentReadStreamError(error) {
        try {
            response.setHeader("Content-Length", "0");
            response.setHeader("Cache-Control", "max-age=0");
            response.writeHead(500, "Server Error");
        }
        catch (headerError) {
        }
        finally {
            response.end("500 Server Error");
        }
    });
}
function handleRequest(request, response) {
    console.log('Req ' + request.url);
    if (reUrlBB.test(request.url)) {
        if (request.url.length === 3) {
            response.writeHead(301, { Location: "/bb/" });
            response.end();
            return;
        }
        var name_1 = request.url.substr(4);
        if (name_1.length === 0)
            name_1 = 'index.html';
        if (/^base\//.test(name_1)) {
            fileResponse(response, curProjectDir + name_1.substr(4));
            return;
        }
        fileResponse(response, distWebRoot + "/" + name_1);
        return;
    }
    if (request.url === '/') {
        response.end(memoryFs['index.html']);
        return;
    }
    var f = memoryFs[request.url.substr(1)];
    if (f) {
        response.end(f);
        return;
    }
    response.statusCode = 404;
    response.end('Not found');
}
function autodetectMainTs(project) {
    var searchMainTsList = ['index.ts', 'app.ts', 'lib.ts', 'src/index.ts', 'src/app.ts', 'src/lib.ts'];
    for (var i = 0; i < searchMainTsList.length; i++) {
        var fn = searchMainTsList[i];
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
function createProjectFromPackageJson() {
    var project = {
        dir: process.cwd().replace(/\\/g, '/'),
        main: 'src/app.ts',
        mainJsFile: 'src/app.js',
        options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5, skipDefaultLibCheck: true }
    };
    var packageJson = null;
    try {
        packageJson = fs.readFileSync('package.json', 'utf-8');
    }
    catch (err) {
        console.log('Cannot read package.json ' + err + '. Autodetecting main ts file.');
        return autodetectMainTs(project);
    }
    var packageObj = null;
    try {
        packageObj = JSON.parse(packageJson);
    }
    catch (err) {
        console.log('Package.json cannot be parsed. ' + err);
        return null;
    }
    if (packageObj.typescript && typeof packageObj.typescript.main === 'string') {
        var main = packageObj.typescript.main;
        if (!fs.existsSync(main)) {
            console.log('Package.json typescript.main is ' + main + ', but this file does not exists. Aborting.');
            return null;
        }
        project.main = main;
        project.mainJsFile = main.replace(/\.ts$/, '.js');
    }
    else {
        console.log('Package.json missing typescript.main. Autodetecting main ts file.');
        project = autodetectMainTs(project);
        if (project == null)
            return null;
    }
    var bobrilSection = packageObj.bobril;
    if (bobrilSection == null)
        return project;
    if (typeof bobrilSection.title === 'string') {
        project.htmlTitle = bobrilSection.title;
    }
    if (typeof bobrilSection.dir === 'string') {
        project.outputDir = bobrilSection.dir;
    }
    return project;
}
function presetDebugProject(project) {
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
function presetLiveReloadProject(project) {
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
function presetReleaseProject(project) {
    project.debugStyleDefs = false;
    project.releaseStyleDefs = true;
    project.spriteMerge = true;
    project.totalBundle = true;
    project.compress = true;
    project.mangle = true;
    project.beautify = false;
    project.defines = { DEBUG: false };
}
function startBackgroundProcess(name, callbacks) {
    var child = childProcess.fork(path.dirname(__dirname.replace(/\\/g, "/")) + "/cli", ["background"]);
    var currentCallbacks = callbacks || {};
    if (!currentCallbacks["error"]) {
        currentCallbacks["error"] = function (param) {
            console.log(name + ":responded with error " + param);
        };
    }
    child.on("error", function (err) {
        console.log(name + ":" + err);
    });
    child.on("message", function (_a) {
        var command = _a.command, param = _a.param;
        if (typeof currentCallbacks[command] === "function") {
            currentCallbacks[command](param);
        }
        else {
            console.log(name + ":" + "unknown response command " + command + " with parameter " + JSON.stringify(param));
        }
    });
    child.on("exit", function () {
        if (typeof currentCallbacks["exit"] === "function") {
            currentCallbacks["exit"]();
        }
        else {
            console.log(name + ":" + "exited without anybody noticing");
        }
    });
    return function (command, param, callbacks) {
        Object.assign(currentCallbacks, callbacks);
        child.send({ command: command, param: param });
    };
}
var watchProcess = null;
function startWatchProcess(notify) {
    watchProcess = startBackgroundProcess("watch", {});
    var startWatchTime = Date.now();
    watchProcess("watch", { paths: ['**/*.ts', '**/tsconfig.json', '**/package.json'] }, {
        watchReady: function () {
            console.log("Watching ready in " + (Date.now() - startWatchTime).toFixed(0) + "ms");
        },
        watchChange: function () {
            notify();
        },
        exit: function () {
            console.log("watch process exited");
        }
    });
}
var lastId = 0;
function startCompileProcess(path) {
    var compileProcess = startBackgroundProcess("compile", {});
    var myId = "" + (lastId++);
    compileProcess("createProject", { id: myId, dir: path });
    return {
        stop: function () {
            compileProcess("disposeProject", myId, { exit: function () { } });
        },
        refresh: function () {
            return new Promise(function (resolve, reject) {
                compileProcess("refreshProject", myId, {
                    log: function (param) { console.log(param); },
                    refreshed: function (param) {
                        if (param)
                            resolve();
                        else
                            reject(new Error("Refresh failed"));
                    },
                });
            });
        },
        setOptions: function (options) {
            return new Promise(function (resolve, reject) {
                compileProcess("setProjectOptions", { id: myId, options: options }, {
                    log: function (param) { console.log(param); },
                    options: function (param) {
                        resolve(param);
                    },
                });
            });
        },
        loadTranslations: function () {
            return new Promise(function (resolve, reject) {
                compileProcess("loadTranslations", myId, {
                    log: function (param) { console.log(param); },
                    loaded: function () {
                        resolve();
                    },
                });
            });
        },
        compile: function () {
            return new Promise(function (resolve, reject) {
                var startCompilation = Date.now();
                var writtenFileCount = 0;
                compileProcess("compile", myId, {
                    log: function (param) { console.log(param); },
                    write: function (_a) {
                        var name = _a.name, buffer = _a.buffer;
                        writtenFileCount++;
                        console.log(name);
                        write(name, new Buffer(buffer, "binary"));
                    },
                    compileOk: function () {
                        console.log("Compiled in " + (Date.now() - startCompilation).toFixed(0) + "ms. Updated " + writtenFileCount + " file" + (writtenFileCount !== 1 ? "s" : "") + ".");
                        resolve();
                    },
                    compileFailed: function (param) {
                        console.log(param);
                        console.log("Compilation failed in " + (Date.now() - startCompilation).toFixed(0) + "ms");
                        reject(param);
                    }
                });
            });
        }
    };
}
function humanTrue(val) {
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
function interactiveCommand(port) {
    if (port === void 0) { port = 8080; }
    curProjectDir = bb.currentDirectory();
    var server = http.createServer(handleRequest);
    server.listen(port, function () {
        console.log("Server listening on: http://localhost:" + port);
    });
    var compileProcess = startCompileProcess(curProjectDir);
    compileProcess.refresh().then(function () {
        return compileProcess.setOptions(getDefaultDebugOptions());
    }).then(function (opts) {
        return compileProcess.loadTranslations();
    }).then(function (opts) {
        return compileProcess.compile();
    });
    startWatchProcess(function () {
        compileProcess.refresh().then(function () { return compileProcess.compile(); });
    });
}
function run() {
    var commandRunning = false;
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
        .action(function (c) {
        commandRunning = true;
        var project = bb.createProjectFromDir(bb.currentDirectory());
        project.logCallback = function (text) {
            console.log(text);
        };
        if (!bb.refreshProjectFromPackageJson(project)) {
            process.exit(1);
        }
        if (c["dir"])
            project.outputDir = c["dir"];
        if (humanTrue(c["fast"])) {
            presetDebugProject(project);
        }
        else {
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
        bb.compileProject(project).then(function () {
            console.timeEnd("compile");
            process.exit(0);
        }, function (err) {
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
        .action(function (c) {
        commandRunning = true;
        var project = bb.createProjectFromDir(bb.currentDirectory());
        var trDir = path.join(project.dir, "translations");
        var trDb = new bb.TranslationDb();
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
        .command("interactive")
        .alias("i")
        .option("-p, --port <port>", "set port for server to listen to (default 8080)")
        .description("runs web controled build ui")
        .action(function (c) {
        commandRunning = true;
        interactiveCommand(c["port"]);
    });
    c.command('*', null, { noHelp: true }).action(function (com) {
        console.log("Invalid command " + com);
    });
    c.parse(process.argv);
    if (!commandRunning) {
        interactiveCommand(c["port"]);
    }
}
exports.run = run;
