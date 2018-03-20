import * as c from "commander";
import * as ts from "typescript";
import * as bb from "./index";
import * as http from "http";
import * as childProcess from "child_process";
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everywhere, just use forward slashes
import * as fs from "fs";
import * as plugins from "./pluginsLoader";
import * as depChecker from "./dependenciesChecker";
import { AdditionalResources } from "./additionalResources";
import * as chalk from "chalk";

var serverAdditionalResources: AdditionalResources;

const reUrlBB = /^\/bb(?:$|\/)/;
const reUrlTest = /^test(?:$|\/)/;
const distWebRoot = bb.bbDirRoot + "/distweb";
const distWebtRoot = bb.bbDirRoot + "/distwebt";
let server: http.Server = null;
let chromeProcess: bb.IChromeProcess = null;

function startTestsInChrome(): Promise<void> {
    var chrome = bb.launchChrome(
        `http://localhost:${server.address().port}/bb/test/`
    );
    chromeProcess = chrome[1];
    process.on("exit", () => {
        if (chromeProcess != null) chromeProcess.kill();
    });
    return chrome[0];
}

function exitProcess(code: number) {
    if (chromeProcess != null) {
        chromeProcess.kill();
        chromeProcess = null;
    }
    process.exit(code);
}

function fileResponse(response: http.ServerResponse, name: string) {
    let contentStream = <fs.ReadStream>fs
        .createReadStream(name)
        .on("open", function handleContentReadStreamOpen() {
            contentStream.pipe(response);
        })
        .on("error", function handleContentReadStreamError(error) {
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
        });
}

let specialFiles: { [name: string]: string | Buffer } = Object.create(null);

import * as pathUtils from "./pathUtils";

specialFiles["loader.js"] = require.resolve("./loader.js");
specialFiles["jasmine-core.js"] = path.join(
    pathUtils.dirOfNodeModule("jasmine-core"),
    "jasmine-core/jasmine.js"
);
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

function handleRequest(
    request: http.ServerRequest,
    response: http.ServerResponse
) {
    // console.log('Req ' + request.url);
    if (reUrlBB.test(request.url)) {
        if (request.url.length === 3) {
            response.writeHead(301, { Location: "/bb/" });
            response.end();
            return;
        }
        let name = request.url.substr(4);
        if (name === "api/test") {
            bb.testServer.handle(request, response);
            return;
        }
        if (name === "api/main") {
            bb.mainServer.handle(request, response);
            return;
        }
        if (name === "api/projectdirectory") {
            let project = bb.getProject();
            response.end(project.dir);
            return;
        }
        if (name.substr(0, 15) === "api/livereload/") {
            let idx = parseInt(name.substr(15), 10);
            let waitForReload = () => {
                if (idx != bb.getProject().liveReloadIdx)
                    response.end("reload");
                else {
                    if (!livereloadResolver) {
                        livereloadPromise = new Promise<void>(
                            (resolve, reject) => {
                                livereloadResolver = resolve;
                            }
                        );
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
            if (name.length === 0) name = "index.html";
            fileResponse(response, distWebtRoot + "/" + name);
            return;
        }
        if (name.length === 0) name = "index.html";
        if (/^base\//.test(name)) {
            let project = bb.getProject();
            fileResponse(
                response,
                path.join(
                    bb.getCurProjectDir(),
                    path.relative(project.realRootRel, ""),
                    name.substr(4)
                )
            );
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
    if (request.url === "/") {
        response.end(bb.memoryFs["index.html"]);
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
    response.end("Not found");
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
    server.on("listening", function() {
        bb.setInteractivePort(server.address().port);
        console.log(
            "Server listening on: " +
                chalk.cyan(" http://localhost:" + server.address().port)
        );
    });
    server.on("error", function(e) {
        if ((e as any).code == "EADDRINUSE") {
            setTimeout(function() {
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

function buildWriter(): ((name: string, content: Buffer) => void) | undefined {
    let project = bb.getProject();
    if (project.packageJsonBobril["interactiveToDisk"]) {
        return (name: string, content: Buffer) => {
            bb.writeToMemoryFs(name, content);
            let fullname = path.join(project.outputDir || "./dist", name);
            console.log("Writing " + fullname);
            bb.mkpathsync(path.dirname(fullname));
            fs.writeFileSync(fullname, content);
        };
    }
    return undefined;
}

export async function forceInteractiveRecompile(): Promise<void> {
    let v = await compileProcess.compile(buildWriter());
    let opts = await compileProcess.setOptions({});
    mergeProjectFromServer(opts);
    await Promise.all(
        plugins.pluginsLoader.executeEntryMethod(
            plugins.EntryMethodType.afterInteractiveCompile,
            v
        )
    );
    if (v.errors != 0) {
        if (v.hasTests) {
            console.log(
                chalk.red(
                    "Skipping testing due to " + v.errors + " errors in build."
                )
            );
        } else {
            console.log(
                chalk.red("Build failed with " + v.errors + " errors.")
            );
        }
    } else {
        console.log(
            chalk.green(
                "Build finished with " +
                    v.warnings +
                    " warnings." +
                    (v.hasTests ? " Starting tests." : "")
            )
        );
    }
    if (v.errors == 0) {
        if (livereloadResolver) {
            livereloadResolver();
            livereloadResolver = null;
        }
        if (v.hasTests) {
            if (chromeProcess == null) await startTestsInChrome();
            bb.testServer.startTest("/test.html");
            bb.testServer.waitForOneResult().then(v => {
                console.log(
                    (v.testsFailed > 0 ? chalk.red : chalk.green)(
                        "Tests: " +
                            v.testsFailed +
                            " failed " +
                            v.testsSkipped +
                            " skipped " +
                            v.testsFinished +
                            " succeeded"
                    )
                );
            });
        }
    }
}

function interactiveCommand(port: number, installDependencies: boolean) {
    bb.mainServer.setProjectDir(bb.getCurProjectDir());
    startHttpServer(port);
    compileProcess = bb.startCompileProcess(bb.getCurProjectDir());
    compileProcess
        .refresh(null)
        .then(() => {
            return compileProcess.setOptions(getDefaultDebugOptions());
        })
        .then(opts => {
            mergeProjectFromServer(opts);
            if (installDependencies)
                return compileProcess.installDependencies().then(() => opts);
            return opts;
        })
        .then(opts => {
            return compileProcess.callPlugins(
                plugins.EntryMethodType.afterStartCompileProcess
            );
        })
        .then(opts => {
            return compileProcess.loadTranslations();
        })
        .then(opts => {
            bb.startWatchProcess((allFiles: { [dir: string]: string[] }) => {
                console.log(chalk.green("Starting compilation."));
                return compileProcess
                    .refresh(allFiles)
                    .then(forceInteractiveRecompile);
            });
        });
}

function createAdditionalResources(project: bb.IProject) {
    if (project.additionalResources == null)
        project.additionalResources = new AdditionalResources(project);
    return project.additionalResources;
}

export function run() {
    let commandRunning = false;
    let range = [];
    bb.setCurProjectDir(bb.currentDirectory());
    c
        .command("build")
        .alias("b")
        .description("just build and stop")
        .option(
            "-d, --dir <outputdir>",
            "define where to put build result (default is ./dist)"
        )
        .option(
            "-f, --fast <1/0>",
            "quick debuggable bundling",
            /^(true|false|1|0|t|f|y|n)$/i,
            "0"
        )
        .option(
            "-c, --compress <1/0>",
            "remove dead code",
            /^(true|false|1|0|t|f|y|n)$/i,
            "1"
        )
        .option(
            "-m, --mangle <1/0>",
            "minify names",
            /^(true|false|1|0|t|f|y|n)$/i,
            "1"
        )
        .option(
            "-b, --beautify <1/0>",
            "readable formatting",
            /^(true|false|1|0|t|f|y|n)$/i,
            "0"
        )
        .option(
            "-s, --style <0/1/2>",
            "override styleDef className preservation level",
            /^(0|1|2)$/,
            ""
        )
        .option("-p, --sprite <0/1>", "enable/disable creation of sprites")
        .option(
            "-l, --localize <1/0>",
            "create localized resources (default autodetect)",
            /^(true|false|1|0|t|f|y|n)$/i,
            ""
        )
        .option(
            "-u, --updateTranslations <1/0>",
            "update translations",
            /^(true|false|1|0|t|f|y|n)$/i,
            "0"
        )
        .option(
            "-v, --versiondir <name>",
            "store all resources except index.html in this directory"
        )
        .option("-n, --noupdate", "do not start yarn/npm before build")
        .action(c => {
            commandRunning = true;
            let start = Date.now();
            let project = bb.createProjectFromDir(bb.getCurProjectDir());
            project.logCallback = text => {
                console.log(text);
            };
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
                project.options.sourceRoot = path.relative(
                    project.outputDir,
                    "."
                );
            }
            if (!c["noupdate"]) {
                if (!depChecker.installMissingDependencies(project))
                    process.exit(1);
            }
            createAdditionalResources(project);
            bb.compileProject(project).then(
                (result: bb.CompilationResult) => {
                    if (
                        result.errors == 0 &&
                        project.additionalResources.copyFilesToOutputDir()
                    ) {
                        console.log(
                            chalk.green(
                                "Build finished successfully with " +
                                    result.warnings +
                                    " warnings in " +
                                    (Date.now() - start).toFixed(0) +
                                    " ms"
                            )
                        );
                        process.exit(0);
                    }
                    console.error(
                        chalk.red(
                            "There was " +
                                result.errors +
                                " errors during build"
                        )
                    );
                    process.exit(1);
                },
                err => {
                    console.error(err);
                    process.exit(1);
                }
            );
        });
    c
        .command("translation")
        .alias("t")
        .description("everything around translations")
        .option("-a, --addlang <lang>", "add new language")
        .option("-r, --removelang <lang>", "remove language")
        .option("-e, --export <path>", "export untranslated languages")
        .option("-x, --exportAll <path>", "export all texts from all languages")
        .option("-i, --import <path>", "import translated language")
        .option(
            "-p, --specificPath <path>",
            "specify path for export from / import to "
        )
        .option("-l, --lang <lang>", "specify language for export")
        .option(
            "-u, --union <sourcePath1,sourcePath2,destinationPath>",
            "make union from paths"
        )
        .option(
            "-s, --subtract <sourcePath1,sourcePath2,destinationPath>",
            "make subtract of paths"
        )
        .action(c => {
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
            if (c["export"] || c["exportAll"]) {
                let exportOnlyUntranslated = true;
                let destFile = c["export"];
                let db = c["specificPath"] === undefined ? trDb : trDbSingle;

                if (c["exportAll"]) {
                    destFile = c["exportAll"];
                    exportOnlyUntranslated = false;
                }

                if (c["specificPath"] === undefined) {
                    if (c["lang"] != undefined) {
                        console.log(
                            "Export untranslated language " +
                                c["lang"] +
                                " into file " +
                                destFile
                        );
                    } else {
                        console.log(
                            "Export untranslated languages into file " +
                                destFile
                        );
                    }
                } else {
                    console.log(
                        "Export file from " +
                            c["specificPath"] +
                            " into file " +
                            destFile
                    );
                }

                if (
                    !db.exportLanguages(
                        destFile,
                        c["lang"],
                        c["specificPath"],
                        exportOnlyUntranslated
                    )
                )
                    process.exit(1);
                process.exit(0);
            }
            if (c["import"]) {
                let langPath = c["specificPath"];
                if (langPath === undefined) {
                    console.log(
                        "Import translated language from file " +
                            c["import"] +
                            "."
                    );
                    if (!trDb.importTranslatedLanguage(c["import"], langPath))
                        process.exit(1);
                    trDb.saveLangDbs(trDir);
                } else {
                    console.log(
                        "Import translated language from file " +
                            c["import"] +
                            " to file " +
                            langPath
                    );
                    if (
                        !trDbSingle.importTranslatedLanguage(
                            c["import"],
                            langPath
                        )
                    )
                        process.exit(1);
                    let lang = trDbSingle.getLanguageFromSpecificFile(langPath);
                    trDbSingle.saveLangDb(langPath, lang);
                }
            }
            if (c["union"]) {
                let uArgs = c["union"].split(",");
                if (uArgs.length != 3) {
                    console.log("Invalid count of parameters.");
                    process.exit(1);
                }
                if (
                    !trDb.makeUnionOfExportedLanguages(
                        uArgs[0],
                        uArgs[1],
                        uArgs[2]
                    )
                )
                    process.exit(1);
            }
            if (c["subtract"]) {
                let uArgs = c["subtract"].split(",");
                if (uArgs.length != 3) {
                    console.log("Invalid count of parameters.");
                    process.exit(1);
                }
                if (
                    !trDb.makeSubtractOfExportedLanguages(
                        uArgs[0],
                        uArgs[1],
                        uArgs[2]
                    )
                )
                    process.exit(1);
            }
            process.exit(0);
        });
    c
        .command("test")
        .description("runs tests once in Chrome")
        .option("-o, --out <name>", "filename for test result as JUnit XML")
        .action(async c => {
            try {
                var startTime = Date.now();
                commandRunning = true;
                startHttpServer(0);
                console.time("compile");
                let project = bb.createProjectFromDir(bb.getCurProjectDir());
                project.logCallback = text => {
                    console.log(text);
                };
                if (!bb.refreshProjectFromPackageJson(project, null)) {
                    process.exit(1);
                }
                var compilationCache = new bb.CompilationCache();
                await bb.fillMainSpec(project);
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
                await compilationCache.compile(project);
                if (project.localize) {
                    bb.emitTranslationsJs(
                        project,
                        project.compileTranslation as bb.TranslationDb
                    );
                }
                bb.updateTestHtml(project);
                console.timeEnd("compile");
                let result = compilationCache.getResult();
                if (result.errors != 0) {
                    console.log(
                        chalk.red(
                            "Skipping testing due to " +
                                result.errors +
                                " errors in build."
                        )
                    );
                    process.exit(1);
                }
                console.log(
                    chalk.green(
                        "Build finished with " +
                            result.warnings +
                            " warnings. Starting tests."
                    )
                );
                await startTestsInChrome();
                bb.testServer.startTest("/test.html");
                var code: number | bb.TestResultsHolder = await Promise.race<
                    number | bb.TestResultsHolder
                >([chromeProcess.finish, bb.testServer.waitForOneResult()]);
                if (typeof code === "number") {
                    console.log("chrome result code:" + code);
                    exitProcess(1);
                } else if (code == null) {
                    console.log("test timeout on start");
                    exitProcess(1);
                } else {
                    if (c["out"]) {
                        fs.writeFileSync(c["out"], bb.toJUnitXml(code));
                    }
                    if (code.failure) {
                        console.log(
                            chalk.red(
                                code.totalTests +
                                    " tests finished with " +
                                    code.testsFailed +
                                    " failures. Total time " +
                                    (Date.now() - startTime).toFixed(0) +
                                    "ms"
                            )
                        );
                        exitProcess(1);
                    } else {
                        console.log(
                            chalk.green(
                                code.totalTests +
                                    " tests finished without failures. Total time " +
                                    (Date.now() - startTime).toFixed(0) +
                                    "ms"
                            )
                        );
                        exitProcess(0);
                    }
                }
            } catch (err) {
                console.error(err);
                exitProcess(1);
            }
        });
    c
        .command("interactive")
        .alias("i")
        .option(
            "-p, --port <port>",
            "set port for server to listen to (default 8080)",
            8080
        )
        .description("runs web controlled build ui")
        .action(c => {
            commandRunning = true;
            interactiveCommand(c["port"], true);
        });
    c
        .command("interactiveNoUpdate")
        .alias("y")
        .option(
            "-p, --port <port>",
            "set port for server to listen to (default 8080)",
            8080
        )
        .description(
            "runs web controlled build ui without updating dependencies"
        )
        .action(c => {
            commandRunning = true;
            interactiveCommand(c["port"], false);
        });
    c.command("*", null, { noHelp: true }).action(com => {
        console.log("Invalid command " + com);
    });

    plugins.pluginsLoader.registerCommands(c, function() {
        commandRunning = true;
    });
    plugins.pluginsLoader.executeEntryMethod(
        plugins.EntryMethodType.registerCommands,
        c,
        bb,
        function() {
            commandRunning = true;
        }
    );
    depChecker.registerCommands(c, function() {
        commandRunning = true;
    });

    let res = c.parse(process.argv);
    if (!commandRunning) {
        interactiveCommand(8080, true);
    }
}
