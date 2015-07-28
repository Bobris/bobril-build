var ts = require("typescript");
var fs = require("fs");
var path = require("path");
var BuildHelpers = require('./buildHelpers');
function reportDiagnostic(diagnostic) {
    var output = '';
    if (diagnostic.file) {
        var loc = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        output += diagnostic.file.fileName + "(" + (loc.line + 1) + "," + (loc.character + 1) + "): ";
    }
    var category = ts.DiagnosticCategory[diagnostic.category].toLowerCase();
    output += category + " TS" + diagnostic.code + ": " + diagnostic.messageText + ts.sys.newLine;
    ts.sys.write(output);
}
function reportDiagnostics(diagnostics) {
    for (var i = 0; i < diagnostics.length; i++) {
        reportDiagnostic(diagnostics[i]);
    }
}
var CompilationCache = (function () {
    function CompilationCache(resolvePathStringLiteral) {
        this.resolvePathStringLiteral = resolvePathStringLiteral || (function (nn) { return path.join(path.dirname(nn.getSourceFile().fileName), nn.text); });
        this.defaultLibFilename = path.join(path.dirname(path.resolve(require.resolve('typescript'))), 'lib.es6.d.ts');
        this.defaultLibFilenameNorm = this.defaultLibFilename.replace(/\\/g, '/');
        this.cacheFiles = Object.create(null);
    }
    CompilationCache.prototype.compile = function (project) {
        // TODO quick check if nothing changed
        var program = ts.createProgram([project.main], project.options, this.createCompilerHost(this, project.dir));
        var diagnostics = program.getSyntacticDiagnostics();
        reportDiagnostics(diagnostics);
        if (diagnostics.length === 0) {
            var diagnostics_1 = program.getGlobalDiagnostics();
            reportDiagnostics(diagnostics_1);
            if (diagnostics_1.length === 0) {
                var diagnostics_2 = program.getSemanticDiagnostics();
                reportDiagnostics(diagnostics_2);
            }
        }
        var tc = program.getTypeChecker();
        var sourceFiles = program.getSourceFiles();
        for (var i = 0; i < sourceFiles.length; i++) {
            var src = sourceFiles[i];
            if (src.hasNoDefaultLib)
                continue; // skip searching default lib
            var resolvedName = path.resolve(project.dir, src.fileName);
            var cached = this.cacheFiles[resolvedName.toLowerCase()];
            if (cached.sourceTime !== cached.infoTime) {
                cached.info = BuildHelpers.gatherSourceInfo(src, tc, this.resolvePathStringLiteral);
                cached.infoTime = cached.sourceTime;
            }
        }
        for (var i = 0; i < sourceFiles.length; i++) {
            var src = sourceFiles[i];
            if (src.hasNoDefaultLib)
                continue; // skip searching default lib
            var restorationMemory = [];
            var resolvedName = path.resolve(project.dir, src.fileName);
            var info = this.cacheFiles[resolvedName.toLowerCase()].info;
            for (var j = 0; j < info.styleDefs.length; j++) {
                var sd = info.styleDefs[j];
                if (project.debugStyleDefs) {
                    var name_1 = sd.name;
                    if (sd.callExpression.arguments.length === 3 + (sd.isEx ? 1 : 0))
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
        }
    };
    CompilationCache.prototype.createCompilerHost = function (cc, currentDirectory) {
        function getCanonicalFileName(fileName) {
            return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
        }
        function getSourceFile(fileName, languageVersion, onError) {
            var isDefLib = fileName === cc.defaultLibFilenameNorm;
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
            var resolvedName = path.resolve(currentDirectory, fileName);
            var cached = cc.cacheFiles[resolvedName.toLowerCase()];
            if (cached === undefined) {
                cached = { fullName: resolvedName };
                cc.cacheFiles[resolvedName.toLowerCase()] = cached;
            }
            if (cached.curTime == null) {
                if (cached.curTime === null && !onError) {
                    return null;
                }
                try {
                    cached.curTime = fs.statSync(resolvedName).mtime.getTime();
                }
                catch (er) {
                    cached.curTime == null;
                    if (onError)
                        onError('Checking modification time of ' + resolvedName + " failed with " + er);
                    return null;
                }
            }
            if (cached.textTime !== cached.curTime) {
                var text;
                try {
                    text = fs.readFileSync(resolvedName).toString();
                }
                catch (er) {
                    if (onError)
                        onError('Openning ' + resolvedName + " failed with " + er);
                    return null;
                }
                cached.textTime = cached.curTime;
                cached.text = text;
            }
            if (cached.sourceTime !== cached.textTime) {
                cached.sourceFile = ts.createSourceFile(fileName, cached.text, languageVersion, true);
                cached.sourceTime = cached.textTime;
            }
            return cached.sourceFile;
        }
        function writeFile(fileName, data, writeByteOrderMark, onError) {
            fileName = path.join(currentDirectory, fileName);
            try {
                var text = ts.sys.readFile(fileName, 'utf-8');
            }
            catch (e) {
                text = "";
            }
            if (text === data) {
                fs.utimesSync(fileName, new Date(), new Date());
                return;
            }
            try {
                ts.sys.writeFile(fileName, data, false);
            }
            catch (e) {
                if (onError) {
                    onError(e.message);
                }
            }
        }
        return {
            getSourceFile: getSourceFile,
            getDefaultLibFileName: function (options) { return cc.defaultLibFilenameNorm; },
            writeFile: writeFile,
            getCurrentDirectory: function () { return currentDirectory; },
            useCaseSensitiveFileNames: function () { return ts.sys.useCaseSensitiveFileNames; },
            getCanonicalFileName: getCanonicalFileName,
            getNewLine: function () { return '\n'; }
        };
    };
    return CompilationCache;
})();
exports.CompilationCache = CompilationCache;
