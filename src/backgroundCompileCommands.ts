import * as bb from '../index';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";

var compilationCache = new bb.CompilationCache();
var translationDb = new bb.TranslationDb();
var memoryFs: { [name: string]: Buffer } = Object.create(null);
var project: bb.IProject = { main: [], dir: null, options: null };

function write(fn: string, b: Buffer) {
    memoryFs[fn] = b;
    process.send({ command: "write", param: { name: fn, buffer: b.toString("binary") } });
}

//function writeDist(fn: string, b: Buffer) {
//    let ofn = path.join('dist', fn);
//    console.log('Writting ' + ofn);
//    memoryFs[fn] = b;
//    bb.mkpathsync(path.dirname(ofn));
//    fs.writeFileSync(ofn, b);
//}

export function initProject(param: { project: bb.IProject }) {
    Object.assign(project, param.project);
    project.writeFileCallback = write;
    project.logCallback = (text) =>{
        process.send({ command: "log", param: text });
    };
}

export function compile(param: { paths: string[] }) {
    compilationCache.clearFileTimeModifications();
    return compilationCache.compile(project).then(() => {
        if (!project.totalBundle) bb.updateSystemJsByCC(compilationCache, project.writeFileCallback);
        bb.updateIndexHtml(project);
    }).then(() => {
        process.send({ command: "compileOk" });
    }, (err) => {
        process.send({ command: "compileFailed", param: err });
    });
}
