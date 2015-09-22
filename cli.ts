import * as ts from 'typescript';
import * as bb from './index';
import * as chokidar from 'chokidar';
import * as http from 'http';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";

function printIntroLine() {
    let pp = pathPlatformDependent.join(__dirname, 'package.json');
    let bbPackageJson = JSON.parse(fs.readFileSync(pp, 'utf8'));
    console.log('Bobril-build ' + bbPackageJson.version + ' - ' + process.cwd());
}


var compilationCache = new bb.CompilationCache();
var translationDb = new bb.TranslationDb();
var memoryFs: { [name:string]:Buffer } = Object.create(null);
var project: bb.IProject;

function write(fn: string, b: Buffer) {
    console.log(fn);
    memoryFs[fn] = b;
}

function compile() {
    console.log('Compiling ...');
    let startCompilation = Date.now();
    compilationCache.clearFileTimeModifications();
    compilationCache.compile(project).then(() => {
        let moduleNames = Object.keys(project.moduleMap);
        let moduleMap = <{ [name: string]: string }>Object.create(null);
        for (let i = 0; i < moduleNames.length; i++) {
            let name = moduleNames[i];
            if (project.moduleMap[name].internalModule)
                continue;
            moduleMap[name] = project.moduleMap[name].jsFile;
        }
        bb.writeSystemJsBasedDist(write, 'src/app.js', moduleMap);
    }).then(() => {
        console.log('Compiled in ' + (Date.now() - startCompilation) + 'ms');
    }, e=> {
        console.log(e);
    });
}

function handleRequest(request: http.ServerRequest, response: http.ServerResponse) {
    console.log('Req ' + request.url);
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

export function run() {
    printIntroLine();
    project = {
        dir: process.cwd().replace(/\\/g, '/'),
        main: 'src/app.ts',
        options: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5 },
        debugStyleDefs: true,
        releaseStyleDefs: false,
        spriteMerge: false,
        writeFileCallback: write
    };
    let startWatching = Date.now();
    chokidar.watch(['**/*.ts', '**/tsconfig.json', 'package.json'], { ignored: /[\/\\]\./, ignoreInitial: true }).once('ready', () => {
        console.log('Watching in ' + (Date.now() - startWatching).toFixed(0)+'ms');
    }).on('all', bb.debounce((v,v2) => {
        compile();
    }));

    var server = http.createServer(handleRequest);
    server.listen(8080, function () {
        console.log("Server listening on: http://localhost:8080");
    });

    compile();
}
