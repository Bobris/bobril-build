import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import * as evalNode from "./evalNode";
import * as spriter from "./spriter";
import * as imageOps from "./imageOps";
import * as imgCache from "./imgCache";
import * as Promise from "bluebird";
import * as BuildHelpers from './buildHelpers';

function reportDiagnostic(diagnostic) {
    var output = '';
    if (diagnostic.file) {
        var loc = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        output += `${diagnostic.file.fileName}(${loc.line + 1},${loc.character + 1}): `;
    }
    var category = ts.DiagnosticCategory[diagnostic.category].toLowerCase();
    output += `${category} TS${diagnostic.code}: ${diagnostic.messageText}${ts.sys.newLine}`;
    ts.sys.write(output);
}

function reportDiagnostics(diagnostics) {
    for (var i = 0; i < diagnostics.length; i++) {
        reportDiagnostic(diagnostics[i]);
    }
}

interface ICacheFile {
    fullName: string;
    text?: string;
    textTime?: number;
    sourceFile?: ts.SourceFile;
    sourceTime?: number;
    info?: BuildHelpers.SourceInfo;
    infoTime?: number;
    curTime?: number;
}

interface IResFile {
    fullName: string;
    lastTime: number;
    curTime?: number;
}

class CompilationCache {
    constructor() {
        this.defaultLibFilename = path.join(path.dirname(path.resolve(require.resolve('typescript'))), 'lib.es6.d.ts');
        this.defaultLibFilenameNorm = this.defaultLibFilename.replace(/\\/g, '/');
        this.cacheFiles = Object.create(null);
    }

    cacheFiles: { [name: string]: ICacheFile };
    defaultLibFilename: string;
    defaultLibFilenameNorm: string;
    defLibPrecompiled: ts.SourceFile;

    createCompilerHost(cc: CompilationCache, currentDirectory: string): ts.CompilerHost {
        function getCanonicalFileName(fileName: string): string {
            return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
        }
        function getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile {
            let isDefLib = fileName === cc.defaultLibFilenameNorm;
            if (isDefLib) {
                if (cc.defLibPrecompiled) return cc.defLibPrecompiled;
                let text: string;
                try {
                    text = fs.readFileSync(cc.defaultLibFilename).toString();
                } catch (er) {
                    if (onError) onError('Openning ' + cc.defaultLibFilename + " failed with " + er);
                    return null;
                }
                cc.defLibPrecompiled = ts.createSourceFile(fileName, text, languageVersion, true);
                return cc.defLibPrecompiled;
            }
            let resolvedName = path.resolve(currentDirectory, fileName);
            let cached = cc.cacheFiles[resolvedName.toLowerCase()];
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
                } catch (er) {
                    cached.curTime == null;
                    if (onError) onError('Checking modification time of ' + resolvedName + " failed with " + er);
                    return null;
                }
            }
            if (cached.textTime !== cached.curTime) {
                let text: string;
                try {
                    text = fs.readFileSync(resolvedName).toString();
                } catch (er) {
                    if (onError) onError('Openning ' + resolvedName + " failed with " + er);
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
            } catch (e) {
                text = "";
            }
            if (text === data) {
                fs.utimesSync(fileName, new Date(), new Date());
                return;
            }
            try {
                ts.sys.writeFile(fileName, data, false);
            } catch (e) {
                if (onError) {
                    onError(e.message);
                }
            }
        }
        return {
            getSourceFile: getSourceFile,
            getDefaultLibFileName: function(options) { return cc.defaultLibFilenameNorm; },
            writeFile: writeFile,
            getCurrentDirectory: function() { return currentDirectory; },
            useCaseSensitiveFileNames: function() { return ts.sys.useCaseSensitiveFileNames; },
            getCanonicalFileName: getCanonicalFileName,
            getNewLine: function() { return '\n'; }
        };
    }

}
