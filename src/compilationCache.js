var ts = require("typescript");
var fs = require("fs");
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var imageOps = require("./imageOps");
var imgCache = require("./imgCache");
require('bluebird');
var BuildHelpers = require('./buildHelpers');
var bobrilDepsHelpers = require('../src/bobrilDepsHelpers');
var pathUtils = require('./pathUtils');
function reportDiagnostic(diagnostic, logcb) {
    var output = '';
    if (diagnostic.file) {
        var loc = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        output += diagnostic.file.fileName + "(" + (loc.line + 1) + "," + (loc.character + 1) + "): ";
    }
    var category = ts.DiagnosticCategory[diagnostic.category].toLowerCase();
    output += category + " TS" + diagnostic.code + ": " + ts.flattenDiagnosticMessageText(diagnostic.messageText, ts.sys.newLine) + ts.sys.newLine;
    logcb(output);
}
function reportDiagnostics(diagnostics, logcb) {
    for (var i = 0; i < diagnostics.length; i++) {
        reportDiagnostic(diagnostics[i], logcb);
    }
}
var CompilationCache = (function () {
    function CompilationCache(resolvePathStringLiteral) {
        this.resolvePathStringLiteral = resolvePathStringLiteral || (function (nn) { return path.join(path.dirname(nn.getSourceFile().fileName), nn.text); });
        this.defaultLibFilename = path.join(path.dirname(require.resolve('typescript').replace(/\\/g, '/')), 'lib.es6.d.ts');
        this.cacheFiles = Object.create(null);
        this.imageCache = new imgCache.ImgCache();
    }
    CompilationCache.prototype.clearFileTimeModifications = function () {
        var cacheFiles = this.cacheFiles;
        var names = Object.keys(cacheFiles);
        for (var i = 0; i < names.length; i++) {
            cacheFiles[names[i]].curTime = undefined;
        }
    };
    CompilationCache.prototype.forceRebuildNextCompile = function (project) {
        if (project) {
            project.moduleMap = null;
            project.depJsFiles = null;
        }
        var cacheFiles = this.cacheFiles;
        var names = Object.keys(cacheFiles);
        for (var i = 0; i < names.length; i++) {
            cacheFiles[names[i]].infoTime = undefined;
            cacheFiles[names[i]].outputTime = undefined;
        }
    };
    CompilationCache.prototype.compile = function (project) {
        var _this = this;
        var mainList = Array.isArray(project.main) ? project.main : [project.main];
        project.logCallback = project.logCallback || (function (text) { return console.log(text); });
        this.logCallback = project.logCallback;
        project.writeFileCallback = project.writeFileCallback || (function (filename, content) { return fs.writeFileSync(filename, content); });
        project.moduleMap = project.moduleMap || Object.create(null);
        project.depJsFiles = project.depJsFiles || Object.create(null);
        this.clearMaxTimeForDeps();
        var mainChangedList = [];
        for (var i = 0; i < mainList.length; i++) {
            var main = mainList[i];
            var mainCache = this.calcMaxTimeForDeps(main, project.dir);
            if (mainCache.maxTimeForDeps !== null || project.spriteMerge != null || project.textForTranslationReplacer != null) {
                mainChangedList.push(main);
            }
        }
        var program = ts.createProgram(mainChangedList, project.options, this.createCompilerHost(this, project, project.writeFileCallback));
        var diagnostics = program.getSyntacticDiagnostics();
        reportDiagnostics(diagnostics, project.logCallback);
        if (diagnostics.length === 0) {
            var diagnostics_1 = program.getGlobalDiagnostics();
            reportDiagnostics(diagnostics_1, project.logCallback);
            if (diagnostics_1.length === 0) {
                var diagnostics_2 = program.getSemanticDiagnostics();
                reportDiagnostics(diagnostics_2, project.logCallback);
            }
        }
        var bundleCache = null;
        if (project.spriteMerge) {
            if (project.imgBundleCache) {
                bundleCache = project.imgBundleCache;
            }
            else {
                bundleCache = new imgCache.ImgBundleCache(this.imageCache);
                project.imgBundleCache = bundleCache;
            }
            bundleCache.clear(false);
        }
        var tc = program.getTypeChecker();
        var sourceFiles = program.getSourceFiles();
        for (var i = 0; i < sourceFiles.length; i++) {
            var src = sourceFiles[i];
            if (src.hasNoDefaultLib)
                continue; // skip searching default lib
            var cached = this.getCachedFileExistence(src.fileName, project.dir);
            if (cached.sourceTime !== cached.infoTime) {
                cached.info = BuildHelpers.gatherSourceInfo(src, tc, this.resolvePathStringLiteral);
                cached.infoTime = cached.sourceTime;
            }
            if (project.spriteMerge) {
                var info = cached.info;
                for (var j = 0; j < info.sprites.length; j++) {
                    var si = info.sprites[j];
                    if (si.name == null)
                        continue;
                    bundleCache.add(project.remapImages ? project.remapImages(si.name) : path.join(project.dir, si.name), si.color, si.width, si.height, si.x, si.y);
                }
            }
            if (project.textForTranslationReporter) {
                var trs = cached.info.trs;
                for (var j = 0; j < trs.length; j++) {
                    var message = trs[j].message;
                    if (typeof message === 'string')
                        project.textForTranslationReporter(trs[j]);
                }
            }
        }
        var prom = Promise.resolve(null);
        if (project.spriteMerge) {
            if (bundleCache.wasChange()) {
                prom = prom.then(function () { return bundleCache.build(); });
                prom = prom.then(function (bi) {
                    return imageOps.savePNG2Buffer(bi);
                });
                prom = prom.then(function (b) {
                    project.writeFileCallback('bundle.png', b);
                    return null;
                });
            }
        }
        prom = prom.then(function () {
            for (var i = 0; i < sourceFiles.length; i++) {
                var src = sourceFiles[i];
                if (src.hasNoDefaultLib)
                    continue; // skip searching default lib
                var cached = _this.getCachedFileExistence(src.fileName, project.dir);
                if (cached.maxTimeForDeps !== null && cached.outputTime != null && cached.maxTimeForDeps <= cached.outputTime
                    && project.spriteMerge == null && project.textForTranslationReplacer == null) {
                    continue;
                }
                if (/\/bobril-g11n\/index.ts$/.test(src.fileName)) {
                    _this.addDepJsToOutput(project, bobrilDepsHelpers.numeralJsPath(), bobrilDepsHelpers.numeralJsFiles()[0]);
                    _this.addDepJsToOutput(project, bobrilDepsHelpers.momentJsPath(), bobrilDepsHelpers.momentJsFiles()[0]);
                }
                var restorationMemory = [];
                var info = cached.info;
                if (project.remapImages && !project.spriteMerge) {
                    for (var j = 0; j < info.sprites.length; j++) {
                        var si = info.sprites[j];
                        if (si.name == null)
                            continue;
                        var newname = project.remapImages(si.name);
                        if (newname != si.name) {
                            restorationMemory.push(BuildHelpers.rememberCallExpression(si.callExpression));
                            BuildHelpers.setArgument(si.callExpression, 0, newname);
                        }
                    }
                }
                if (project.spriteMerge) {
                    for (var j = 0; j < info.sprites.length; j++) {
                        var si = info.sprites[j];
                        if (si.name == null)
                            continue;
                        var bundlePos = bundleCache.query(project.remapImages ? project.remapImages(si.name) : path.join(project.dir, si.name), si.color, si.width, si.height, si.x, si.y);
                        restorationMemory.push(BuildHelpers.rememberCallExpression(si.callExpression));
                        BuildHelpers.setMethod(si.callExpression, "spriteb");
                        BuildHelpers.setArgument(si.callExpression, 0, bundlePos.width);
                        BuildHelpers.setArgument(si.callExpression, 1, bundlePos.height);
                        BuildHelpers.setArgument(si.callExpression, 2, bundlePos.x);
                        BuildHelpers.setArgument(si.callExpression, 3, bundlePos.y);
                        BuildHelpers.setArgumentCount(si.callExpression, 4);
                    }
                }
                if (project.textForTranslationReplacer) {
                    var trs = info.trs;
                    for (var j = 0; j < trs.length; j++) {
                        var message = trs[j].message;
                        if (typeof message === 'string') {
                            var id = project.textForTranslationReplacer(trs[j]);
                            var ce = trs[j].callExpression;
                            restorationMemory.push(BuildHelpers.rememberCallExpression(ce));
                            BuildHelpers.setArgument(ce, 0, id);
                            if (ce.arguments.length > 2) {
                                BuildHelpers.setArgumentCount(ce, 2);
                            }
                        }
                    }
                }
                for (var j = 0; j < info.styleDefs.length; j++) {
                    var sd = info.styleDefs[j];
                    if (project.debugStyleDefs) {
                        var name_1 = sd.name;
                        if (sd.userNamed)
                            continue;
                        if (!name_1)
                            continue;
                        restorationMemory.push(BuildHelpers.rememberCallExpression(sd.callExpression));
                        BuildHelpers.setArgumentCount(sd.callExpression, 3 + (sd.isEx ? 1 : 0));
                        BuildHelpers.setArgument(sd.callExpression, 2 + (sd.isEx ? 1 : 0), name_1);
                    }
                    else if (project.releaseStyleDefs) {
                        if (sd.callExpression.arguments.length === 2 + (sd.isEx ? 1 : 0))
                            continue;
                        restorationMemory.push(BuildHelpers.rememberCallExpression(sd.callExpression));
                        BuildHelpers.setArgumentCount(sd.callExpression, 2 + (sd.isEx ? 1 : 0));
                    }
                }
                program.emit(src);
                for (var j = restorationMemory.length - 1; j >= 0; j--) {
                    restorationMemory[j]();
                }
                cached.outputTime = cached.maxTimeForDeps;
            }
            var jsFiles = Object.keys(project.depJsFiles);
            for (var i = 0; i < jsFiles.length; i++) {
                var jsFile = jsFiles[i];
                var cached = _this.getCachedFileExistence(jsFile, project.dir);
                if (cached.curTime == null) {
                    project.logCallback('Error: Dependent ' + jsFile + ' not found');
                    continue;
                }
                if (cached.outputTime == null || cached.curTime > cached.outputTime) {
                    _this.updateCachedFileContent(cached);
                    if (cached.textTime !== cached.curTime) {
                        project.logCallback('Error: Dependent ' + jsFile + ' failed to load');
                        continue;
                    }
                    project.writeFileCallback(project.depJsFiles[jsFile], new Buffer(cached.text, 'utf-8'));
                }
            }
            if (project.spriteMerge) {
                bundleCache.clear(true);
            }
            return null;
        });
        return prom;
    };
    CompilationCache.prototype.addDepJsToOutput = function (project, srcDir, name) {
        project.depJsFiles[path.join(srcDir, name)] = name;
    };
    CompilationCache.prototype.clearMaxTimeForDeps = function () {
        var cacheFiles = this.cacheFiles;
        var names = Object.keys(cacheFiles);
        for (var i = 0; i < names.length; i++) {
            cacheFiles[names[i]].maxTimeForDeps = undefined;
        }
    };
    CompilationCache.prototype.getCachedFileExistence = function (fileName, baseDir) {
        var resolvedName = pathUtils.isAbsolutePath(fileName) ? fileName : path.join(baseDir, fileName);
        var resolvedNameLowerCased = resolvedName.toLowerCase();
        var cached = this.cacheFiles[resolvedNameLowerCased];
        if (cached === undefined) {
            cached = { fullName: resolvedName };
            this.cacheFiles[resolvedNameLowerCased] = cached;
        }
        if (cached.curTime == null) {
            if (cached.curTime === null) {
                return cached;
            }
            try {
                cached.curTime = fs.statSync(resolvedName).mtime.getTime();
            }
            catch (er) {
                cached.curTime = null;
                return cached;
            }
        }
        return cached;
    };
    CompilationCache.prototype.updateCachedFileContent = function (cached) {
        if (cached.textTime !== cached.curTime) {
            var text;
            try {
                text = fs.readFileSync(cached.fullName).toString();
            }
            catch (er) {
                cached.textTime = null;
                return cached;
            }
            cached.textTime = cached.curTime;
            cached.text = text;
        }
    };
    CompilationCache.prototype.getCachedFileContent = function (fileName, baseDir) {
        var cached = this.getCachedFileExistence(fileName, baseDir);
        if (cached.curTime === null) {
            cached.textTime = null;
            return cached;
        }
        this.updateCachedFileContent(cached);
        return cached;
    };
    CompilationCache.prototype.calcMaxTimeForDeps = function (name, baseDir) {
        var cached = this.getCachedFileExistence(name, baseDir);
        if (cached.maxTimeForDeps !== undefined)
            return cached;
        cached.maxTimeForDeps = cached.curTime;
        if (cached.curTime === null)
            return cached;
        if (cached.outputTime == null) {
            cached.maxTimeForDeps = null;
            return cached;
        }
        if (cached.curTime === cached.infoTime) {
            var deps = cached.info.sourceDeps;
            for (var i = 0; i < deps.length; i++) {
                var depCached = this.calcMaxTimeForDeps(deps[i][1], baseDir);
                if (depCached.maxTimeForDeps === null) {
                    cached.maxTimeForDeps = null;
                    return cached;
                }
                if (depCached.maxTimeForDeps > cached.maxTimeForDeps) {
                    cached.maxTimeForDeps = depCached.maxTimeForDeps;
                }
            }
        }
    };
    CompilationCache.prototype.createCompilerHost = function (cc, project, writeFileCallback) {
        var currentDirectory = project.dir;
        var logCallback = project.logCallback;
        function getCanonicalFileName(fileName) {
            return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
        }
        function getCachedFileExistence(fileName) {
            return cc.getCachedFileExistence(fileName, currentDirectory);
        }
        function getCachedFileContent(fileName) {
            return cc.getCachedFileContent(fileName, currentDirectory);
        }
        function getSourceFile(fileName, languageVersion, onError) {
            var isDefLib = fileName === cc.defaultLibFilename;
            if (isDefLib) {
                if (cc.defLibPrecompiled)
                    return cc.defLibPrecompiled;
                var text;
                try {
                    text = fs.readFileSync(cc.defaultLibFilename).toString();
                }
                catch (er) {
                    if (onError)
                        onError('Openning ' + cc.defaultLibFilename + " failed with " + er);
                    return null;
                }
                cc.defLibPrecompiled = ts.createSourceFile(fileName, text, languageVersion, true);
                return cc.defLibPrecompiled;
            }
            var cached = getCachedFileContent(fileName);
            if (cached.textTime == null) {
                return null;
            }
            if (cached.sourceTime !== cached.textTime) {
                cached.sourceFile = ts.createSourceFile(fileName, cached.text, languageVersion, true);
                cached.sourceTime = cached.textTime;
            }
            return cached.sourceFile;
        }
        function writeFile(fileName, data, writeByteOrderMark, onError) {
            try {
                writeFileCallback(fileName, new Buffer(data));
            }
            catch (e) {
                if (onError) {
                    onError(e.message);
                }
            }
        }
        function resolveModuleExtension(moduleName, nameWithoutExtension, internalModule) {
            var cached = getCachedFileExistence(nameWithoutExtension + '.ts');
            if (cached.curTime !== null) {
                project.moduleMap[moduleName] = { defFile: nameWithoutExtension + '.ts', jsFile: nameWithoutExtension + '.js', isDefOnly: false, internalModule: internalModule };
                return nameWithoutExtension + '.ts';
            }
            cached = getCachedFileExistence(nameWithoutExtension + '.d.ts');
            if (cached.curTime !== null) {
                cached = getCachedFileExistence(nameWithoutExtension + '.js');
                if (cached.curTime !== null) {
                    cc.addDepJsToOutput(project, '.', nameWithoutExtension + '.js');
                    project.moduleMap[moduleName] = { defFile: nameWithoutExtension + '.d.ts', jsFile: nameWithoutExtension + '.js', isDefOnly: true, internalModule: internalModule };
                    return nameWithoutExtension + '.d.ts';
                }
            }
            return null;
        }
        function resolveModuleName(moduleName, containingFile) {
            if (moduleName.substr(0, 1) === '.') {
                var res_1 = resolveModuleExtension(path.join(path.dirname(containingFile), moduleName), path.join(path.dirname(containingFile), moduleName), true);
                if (res_1 == null)
                    throw new Error('Module ' + moduleName + ' is not valid in ' + containingFile);
                return { resolvedFileName: res_1 };
            }
            // support for deprecated import * as b from 'node_modules/bobril/index';
            var curDir = path.dirname(containingFile);
            do {
                var res_2 = resolveModuleExtension(moduleName, path.join(curDir, moduleName), false);
                if (res_2 != null) {
                    if (!/^node_modules\//i.test(moduleName)) {
                        logCallback("Wrong import '" + moduleName + "' in " + containingFile + ". You must use relative path.");
                    }
                    return { resolvedFileName: res_2 };
                }
                var previousDir = curDir;
                curDir = path.dirname(curDir);
                if (previousDir === curDir)
                    break;
            } while (true);
            // only flat node_modules currently supported
            var pkgname = "node_modules/" + moduleName + "/package.json";
            var cached = getCachedFileContent(pkgname);
            if (cached.textTime == null) {
                throw new Error('Cannot resolve ' + moduleName + ' in ' + containingFile + '. ' + pkgname + ' not found');
            }
            var main;
            try {
                main = JSON.parse(cached.text).main;
            }
            catch (e) {
                throw new Error('Cannot parse ' + pkgname + ' ' + e);
            }
            var mainWithoutExt = main.replace(/\.[^/.]+$/, "");
            var res = resolveModuleExtension(moduleName, path.join("node_modules/" + moduleName, mainWithoutExt), false);
            if (res == null)
                throw new Error('Module ' + moduleName + ' is not valid in ' + containingFile);
            return { resolvedFileName: res };
        }
        return {
            getSourceFile: getSourceFile,
            getDefaultLibFileName: function (options) { return cc.defaultLibFilename; },
            writeFile: writeFile,
            getCurrentDirectory: function () { return currentDirectory; },
            useCaseSensitiveFileNames: function () { return ts.sys.useCaseSensitiveFileNames; },
            getCanonicalFileName: getCanonicalFileName,
            getNewLine: function () { return '\n'; },
            fileExists: function (fileName) {
                if (fileName === cc.defaultLibFilename)
                    return true;
                var cached = getCachedFileExistence(fileName);
                if (cached.curTime === null)
                    return false;
                return true;
            },
            readFile: function (fileName) {
                var cached = getCachedFileContent(fileName);
                if (cached.textTime == null)
                    return null;
                return cached.text;
            },
            resolveModuleNames: function (moduleNames, containingFile) {
                return moduleNames.map(function (n) {
                    var r = resolveModuleName(n, containingFile);
                    //console.log(n, containingFile, r);
                    return r;
                });
            }
        };
    };
    return CompilationCache;
})();
exports.CompilationCache = CompilationCache;
