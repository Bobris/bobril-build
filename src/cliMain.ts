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
import { AdditionalResources } from './additionalResources'
import * as chalk from 'chalk';

var serverAdditionalResources: AdditionalResources;

const reUrlBB = /^\/bb(?:$|\/)/;
const reUrlTest = /^test(?:$|\/)/;
const distWebRoot = bb.bbDirRoot + "/distweb";
const distWebtRoot = bb.bbDirRoot + "/distwebt";
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

let livereloadResolver: () => void;
let livereloadPromise: Promise<void>;

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
            bb.testServer.handle(request, response);
            return;
        }
        if (name === 'api/main') {
            bb.mainServer.handle(request, response);
            return;
        }
        if (name === 'api/projectdirectory') {
            let project = bb.getProject();
            response.end(project.dir);
            return;
        }
        if (name.substr(0, 15) === 'api/livereload/') {
            let idx = parseInt(name.substr(15), 10);
            let waitForReload = () => {
                if (idx != bb.getProject().liveReloadIdx) response.end("reload");
                else {
                    if (!livereloadResolver) {
                        livereloadPromise = new Promise<void>((resolve, reject) => {
                            livereloadResolver = resolve;
                        });
                    }
                    livereloadPromise.then(waitForReload);
                }
            };
            waitForReload();
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
            let project = bb.getProject();
            fileResponse(response, path.join(bb.getCurProjectDir(), path.relative(project.realRootRel, ""), name.substr(4)));
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
        response.end(bb.memoryFs['index.html']);
        return;
    }
    let f = bb.memoryFs[request.url.substr(1).toLowerCase()];
    if (f) {
        switch ((path.extname(request.url) || "").toLowerCase()) {
            case ".css":
                response.writeHead(200, { "Content-Type": "text/css" });
                break;
            case ".png":
                response.writeHead(200, { "Content-Type": "image/png" });
                break;
            case ".js":
                response.writeHead(200, { "Content-Type": "text/javascript" });
                break;
            case ".html":
                response.writeHead(200, { "Content-Type": "text/html" });
                break;
        }
        response.end(f);
        return;
    }
    if (serverAdditionalResources == null)
        serverAdditionalResources = createAdditionalResources(bb.getProject());
    f = serverAdditionalResources.tryGetFileContent(request.url.substr(1));
    if (f) {
        response.end(f);
        return;
    }

    response.statusCode = 404;
    response.end('Not found');
}

function humanTrue(val: string): boolean {
    return /^(true|1|t|y)$/i.test(val);
}

function getDefaultDebugOptions(): bb.IProject {
    let proj: bb.IProject = <any>{};
    bb.presetDebugProject(proj);
    return proj;
}

function startHttpServer(port: number) {
    server = http.createServer(handleRequest);
    server.on("listening", function () {
        bb.setInteractivePort(server.address().port);
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

function mergeProjectFromServer(opts: any) {
    Object.assign(bb.getProject(), opts);
}

let compileProcess: bb.ICompileProcess;

export function updateProjectOptions(): Promise<any> {
    return compileProcess.setOptions(bb.getProject());
}

export function forceInteractiveRecompile(): Promise<any> {
    return compileProcess.compile().then(v => {
        compileProcess.setOptions({}).then(opts => {
            mergeProjectFromServer(opts);
            return Promise.all(plugins.pluginsLoader.executeEntryMethod(plugins.EntryMethodType.afterInteractiveCompile, v));
        }).then(() => {
            if (v.errors == 0) {
                if (livereloadResolver) {
                    livereloadResolver();
                    livereloadResolver = null;
                }
            }
            if (v.hasTests) {
                if (phantomJsProcess == null)
                    startTestsInPhantom();
                bb.testServer.startTest('/test.html');
            }
        });
    });
}

function interactiveCommand(port: number) {
    bb.mainServer.setProjectDir(bb.getCurProjectDir());
    startHttpServer(port);
    compileProcess = bb.startCompileProcess(bb.getCurProjectDir());
    compileProcess.refresh(null).then(() => {
        return compileProcess.setOptions(getDefaultDebugOptions());
    }).then((opts) => {
        mergeProjectFromServer(opts);
        return compileProcess.installDependencies().then(() => opts);
    }).then((opts) => {
        return compileProcess.callPlugins(plugins.EntryMethodType.afterStartCompileProcess);
    }).then((opts) => {
        return compileProcess.loadTranslations();
    }).then((opts) => {
        bb.startWatchProcess((allFiles: { [dir: string]: string[] }) => {
            return compileProcess.refresh(allFiles).then(forceInteractiveRecompile);
        });
    });
}

function createAdditionalResources(project: bb.IProject) {
    return new AdditionalResources(project);
}

export function run() {
    let commandRunning = false;
    let range = [];
    bb.setCurProjectDir(bb.currentDirectory());
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
            let project = bb.createProjectFromDir(bb.getCurProjectDir());
            project.logCallback = (text) => {
                console.log(text);
            }
            if (!bb.refreshProjectFromPackageJson(project, null)) {
                process.exit(1);
            }
            project.updateTranslations = humanTrue(c["updateTranslations"]);
            if (c["dir"]) project.outputDir = c["dir"];
            if (humanTrue(c["fast"]) || project.mainExamples.length > 1) {
                bb.presetDebugProject(project);
                if (!humanTrue(c["fast"])) {
                    project.spriteMerge = true;
                }
            } else {
                bb.presetReleaseProject(project);
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
                    console.log(chalk.green("Build finished successfully with " + result.warnings + " warnings in " + (Date.now() - start).toFixed(0) + " ms"));
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
        // moznost lang ma pouze rozsirit prikaz export import a v pripade jejiho zavolani exp/imp pouze dany jazyk
        .option("-l, --lang <lang>", "specify language for import/export")
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

            // nejspis pryc
             if (c["exportlang"]) {
                 let uArgs = c["exportlang"].split(',');
                  if (uArgs.length != 2) {
                    console.log("Invalid count of parameters.");
                    process.exit(1);
                }
                console.log("Export untranslated languages into file " + c["export"] + ".");
                if (!trDb.exportUntranslatedSpecificLanguage(uArgs[0], uArgs[1])){
                    process.exit(1);
                }
             }


            if (c["import"]) {
                console.log("Import translated languages from file " + c["import"] + ".");
                if (!trDb.importTranslatedLanguages(c["import"]))
                    process.exit(1);
                trDb.saveLangDbs(trDir);
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
            let project = bb.createProjectFromDir(bb.getCurProjectDir());
            project.logCallback = (text) => {
                console.log(text);
            }
            if (!bb.refreshProjectFromPackageJson(project, null)) {
                process.exit(1);
            }
            var compilationCache = new bb.CompilationCache();
            bb.fillMainSpec(project).then(() => {
                bb.presetDebugProject(project);
                project.updateTranslations = false;
                project.options.sourceRoot = "/";
                project.fastBundle = true;
                project.main = project.mainSpec;
                project.writeFileCallback = bb.writeToMemoryFs;
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
                bb.testServer.startTest('/test.html');
                return Promise.race<number | bb.TestResultsHolder>([phantomJsProcess.finish, bb.testServer.waitForOneResult()]);
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
        .description("runs web controled build ui")
        .action((c) => {
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
