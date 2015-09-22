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
function write(fn, b) {
    console.log(fn);
    memoryFs[fn] = b;
}
function compile() {
    console.log('Compiling ...');
    var startCompilation = Date.now();
    compilationCache.clearFileTimeModifications();
    compilationCache.compile(project).then(function () {
        var moduleNames = Object.keys(project.moduleMap);
        var moduleMap = Object.create(null);
        for (var i = 0; i < moduleNames.length; i++) {
            var name_1 = moduleNames[i];
            if (project.moduleMap[name_1].internalModule)
                continue;
            moduleMap[name_1] = project.moduleMap[name_1].jsFile;
        }
        bb.writeSystemJsBasedDist(write, 'src/app.js', moduleMap);
    }).then(function () {
        console.log('Compiled in ' + (Date.now() - startCompilation) + 'ms');
    }, function (e) {
        console.log(e);
    });
}
function handleRequest(request, response) {
    console.log('Req ' + request.url);
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
function run() {
    printIntroLine();
    project = {
        dir: process.cwd().replace(/\\/g, '/'),
        main: 'src/app.ts',
        options: { module: 1 /* CommonJS */, target: 1 /* ES5 */ },
        debugStyleDefs: true,
        releaseStyleDefs: false,
        spriteMerge: false,
        writeFileCallback: write
    };
    var startWatching = Date.now();
    chokidar.watch(['**/*.ts', '**/tsconfig.json', 'package.json'], { ignored: /[\/\\]\./, ignoreInitial: true }).once('ready', function () {
        console.log('Watching in ' + (Date.now() - startWatching).toFixed(0) + 'ms');
    }).on('all', bb.debounce(function (v, v2) {
        compile();
    }));
    var server = http.createServer(handleRequest);
    server.listen(8080, function () {
        console.log("Server listening on: http://localhost:8080");
    });
    compile();
}
exports.run = run;
