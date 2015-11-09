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
    console.log('Memory write ' + fn);
    memoryFs[fn] = b;
}
function writeDist(fn, b) {
    var ofn = path.join('dist', fn);
    console.log('Writting ' + ofn);
    memoryFs[fn] = b;
    bb.mkpathsync(path.dirname(ofn));
    fs.writeFileSync(ofn, b);
}
function handleRequest(request, response) {
    //console.log('Req ' + request.url);
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
        options: { module: 1 /* CommonJS */, target: 1 /* ES5 */, skipDefaultLibCheck: true }
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
    return project;
}
function presetDebugProject(project) {
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
    project.writeFileCallback = writeDist;
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
    project.writeFileCallback = writeDist;
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
function startCompileProcess(project) {
    var compileProcess = startBackgroundProcess("compile", {});
    compileProcess("initProject", { project: project });
    return {
        stop: function () {
            compileProcess("stop", null, { exit: function () { } });
        },
        compile: function () {
            return new Promise(function (resolve, reject) {
                var startCompilation = Date.now();
                compileProcess("compile", null, {
                    log: function (param) { console.log("Compilation:" + param); },
                    write: function (_a) {
                        var name = _a.name, buffer = _a.buffer;
                        write(name, new Buffer(buffer, "binary"));
                    },
                    compileOk: function () {
                        console.log("Compiled in " + (Date.now() - startCompilation).toFixed(0) + "ms");
                        resolve();
                    },
                    compileFailed: function (param) {
                        console.log("Compilation failed in " + (Date.now() - startCompilation).toFixed(0) + "ms");
                        reject(param);
                    }
                });
            });
        }
    };
}
function run() {
    project = createProjectFromPackageJson();
    if (project == null)
        return;
    presetLiveReloadProject(project);
    var compileProcess = startCompileProcess(project);
    compileProcess.compile().then(function () {
        var server = http.createServer(handleRequest);
        server.listen(8080, function () {
            console.log("Server listening on: http://localhost:8080");
            browserControl.start(6666, 'chrome', 'http://localhost:8080');
        });
    });
    startWatchProcess(function () {
        compileProcess.compile().then(function () {
            var scriptUrl = browserControl.listScriptUrls()[0];
            var scriptId = browserControl.getScriptIdFromUrl(scriptUrl);
            browserControl.setScriptSource(scriptId, memoryFs["bundle.js"].toString()).then(function () {
                browserControl.evaluate("b.invalidateStyles();b.ignoreShouldChange();");
            });
        });
    });
}
exports.run = run;
