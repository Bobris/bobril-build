var ts = require('typescript');
var bb = require('./index');
var chokidar = require('chokidar');
var http = require('http');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require("fs");
function printIntroLine() {
    var pp = pathPlatformDependent.join(__dirname, 'package.json');
    var bbPackageJson = JSON.parse(fs.readFileSync(pp, 'utf8'));
    console.log('Bobril-build ' + bbPackageJson.version + ' - ' + process.cwd());
}
var compilationCache = new bb.CompilationCache();
var translationDb = new bb.TranslationDb();
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
function compile() {
    console.log('Compiling ...');
    var startCompilation = Date.now();
    compilationCache.clearFileTimeModifications();
    return compilationCache.compile(project).then(function () {
        if (!project.totalBundle)
            bb.updateSystemJsByCC(compilationCache, project.writeFileCallback);
        bb.updateIndexHtml(project);
    }).then(function () {
        console.log('Compiled in ' + (Date.now() - startCompilation) + 'ms');
    }, function (e) {
        console.log(e.stack);
    });
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
function run() {
    printIntroLine();
    project = createProjectFromPackageJson();
    if (project == null)
        return;
    presetLiveReloadProject(project);
    var startWatching = Date.now();
    chokidar.watch(['**/*.ts', '**/tsconfig.json', '**/package.json'], { ignored: /[\/\\]\./, ignoreInitial: true }).once('ready', function () {
        console.log('Watching in ' + (Date.now() - startWatching).toFixed(0) + 'ms');
        compile().then(function () {
            var server = http.createServer(handleRequest);
            server.listen(8080, function () {
                console.log("Server listening on: http://localhost:8080");
                browserControl.start(6666, 'chrome', 'http://localhost:8080');
            });
        });
    }).on('all', bb.debounce(function (v, v2) {
        compile();
    }));
}
exports.run = run;
