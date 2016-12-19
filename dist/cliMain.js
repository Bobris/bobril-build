"use strict";
const c = require("commander");
const bb = require("./index");
const http = require("http");
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
const fs = require("fs");
const plugins = require("./pluginsLoader");
const depChecker = require("./dependenciesChecker");
const additionalResources_1 = require("./additionalResources");
const chalk = require("chalk");
var serverAdditionalResources;
const reUrlBB = /^\/bb(?:$|\/)/;
const reUrlTest = /^test(?:$|\/)/;
const distWebRoot = bb.bbDirRoot + "/distweb";
const distWebtRoot = bb.bbDirRoot + "/distwebt";
let server = null;
let phantomJsProcess = null;
function startTestsInPhantom() {
    phantomJsProcess = bb.startPhantomJs([require.resolve('./phantomjsOpen.js'), `http://localhost:${server.address().port}/bb/test/`]);
}
function fileResponse(response, name) {
    let contentStream = fs.createReadStream(name)
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
let specialFiles = Object.create(null);
const pathUtils = require("./pathUtils");
specialFiles["loader.js"] = require.resolve("./loader.js");
specialFiles["jasmine-core.js"] = path.join(pathUtils.dirOfNodeModule("jasmine-core"), 'jasmine-core/jasmine.js');
specialFiles["jasmine-boot.js"] = require.resolve("./jasmine-boot.js");
let livereloadResolver;
let livereloadPromise;
function respondSpecial(response, name) {
    let c = specialFiles[name];
    if (c == null) {
        console.log(`Respond Special not found ${name}`);
        response.statusCode = 404;
        response.end("Not found");
        return;
    }
    if (typeof c === "string") {
        c = fs.readFileSync(c);
        specialFiles[name] = c;
    }
    response.end(c);
}
function handleRequest(request, response) {
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
                if (idx != bb.getProject().liveReloadIdx)
                    response.end("reload");
                else {
                    if (!livereloadResolver) {
                        livereloadPromise = new Promise((resolve, reject) => {
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
            if (name.length === 0)
                name = 'index.html';
            fileResponse(response, distWebtRoot + "/" + name);
            return;
        }
        if (name.length === 0)
            name = 'index.html';
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
function humanTrue(val) {
    return /^(true|1|t|y)$/i.test(val);
}
function getDefaultDebugOptions() {
    let proj = {};
    bb.presetDebugProject(proj);
    return proj;
}
function startHttpServer(port) {
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
function mergeProjectFromServer(opts) {
    Object.assign(bb.getProject(), opts);
}
let compileProcess;
function updateProjectOptions() {
    return compileProcess.setOptions(bb.getProject());
}
exports.updateProjectOptions = updateProjectOptions;
function forceInteractiveRecompile() {
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
exports.forceInteractiveRecompile = forceInteractiveRecompile;
function interactiveCommand(port) {
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
        bb.startWatchProcess((allFiles) => {
            return compileProcess.refresh(allFiles).then(forceInteractiveRecompile);
        });
    });
}
function createAdditionalResources(project) {
    return new additionalResources_1.AdditionalResources(project);
}
function run() {
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
        };
        if (!bb.refreshProjectFromPackageJson(project, null)) {
            process.exit(1);
        }
        project.updateTranslations = humanTrue(c["updateTranslations"]);
        if (c["dir"])
            project.outputDir = c["dir"];
        if (humanTrue(c["fast"]) || project.mainExamples.length > 1) {
            bb.presetDebugProject(project);
            if (!humanTrue(c["fast"])) {
                project.spriteMerge = true;
            }
        }
        else {
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
        bb.compileProject(project).then((result) => {
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
        .option("-i, --import <path>", "import translated language")
        .option("-p, --specificPath <path>", "specify path for export from / import to ")
        .option("-l, --lang <lang>", "specify language for export")
        .option("-u, --union <sourcePath1,sourcePath2,destinationPath>", "make union from paths")
        .option("-s, --subtract <sourcePath1,sourcePath2,destinationPath>", "make subtract of paths")
        .action((c) => {
        commandRunning = true;
        let project = bb.createProjectFromDir(bb.currentDirectory());
        let trDir = path.join(project.dir, "translations");
        let trDb = new bb.TranslationDb();
        let trDbSingle = new bb.TranslationDb();
        trDb.loadLangDbs(trDir);
        if (c["specificPath"] != undefined) {
            trDbSingle.loadLangDb(c["specificPath"]);
        }
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
            if (c["specificPath"] === undefined) {
                if (c["lang"] != undefined) {
                    console.log("Export untranslated language " + c["lang"] + " into file " + c["export"]);
                }
                else {
                    console.log("Export untranslated languages into file " + c["export"]);
                }
                if (!trDb.exportUntranslatedLanguages(c["export"], c["lang"], c["specificPath"]))
                    process.exit(1);
            }
            else {
                console.log("Export file from " + c["specificPath"] + " into file " + c["export"]);
            }
            if (!trDbSingle.exportUntranslatedLanguages(c["export"], c["lang"], c["specificPath"]))
                process.exit(1);
        }
        if (c["import"]) {
            let langPath = c["specificPath"];
            if (langPath === undefined) {
                console.log("Import translated language from file " + c["import"] + ".");
                if (!trDb.importTranslatedLanguage(c["import"], langPath))
                    process.exit(1);
                trDb.saveLangDbs(trDir);
            }
            else {
                console.log("Import translated language from file " + c["import"] + " to file " + langPath);
                if (!trDbSingle.importTranslatedLanguage(c["import"], langPath))
                    process.exit(1);
                let lang = trDbSingle.getLanguageFromSpecificFile(langPath);
                trDbSingle.saveLangDb(langPath, lang);
            }
        }
        if (c["union"]) {
            let uArgs = c["union"].split(',');
            if (uArgs.length != 3) {
                console.log("Invalid count of parameters.");
                process.exit(1);
            }
            if (!trDb.makeUnionOfExportedLanguages(uArgs[0], uArgs[1], uArgs[2]))
                process.exit(1);
        }
        if (c["subtract"]) {
            let uArgs = c["subtract"].split(',');
            if (uArgs.length != 3) {
                console.log("Invalid count of parameters.");
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
        };
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
            return Promise.race([phantomJsProcess.finish, bb.testServer.waitForOneResult()]);
        }).then((code) => {
            if (typeof code === "number") {
                console.log('phantom result code:' + code);
                process.exit(1);
            }
            else if (code == null) {
                console.log('test timeout on start');
                process.exit(1);
            }
            else {
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
    plugins.pluginsLoader.registerCommands(c, function () { commandRunning = true; });
    plugins.pluginsLoader.executeEntryMethod(plugins.EntryMethodType.registerCommands, c, bb, function () {
        commandRunning = true;
    });
    depChecker.registerCommands(c, function () { commandRunning = true; });
    let res = c.parse(process.argv);
    if (!commandRunning) {
        interactiveCommand(8080);
    }
}
exports.run = run;
//# sourceMappingURL=cliMain.js.map