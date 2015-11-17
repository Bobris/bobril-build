var bb = require('../index');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var compilationCache = new bb.CompilationCache();
var translationDb = new bb.TranslationDb();
var memoryFs = Object.create(null);
var project = { main: [], dir: null, options: null };
function write(fn, b) {
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
function initProject(param) {
    Object.assign(project, param.project);
    project.writeFileCallback = write;
    project.logCallback = function (text) {
        process.send({ command: "log", param: text });
    };
}
exports.initProject = initProject;
function compile(param) {
    compilationCache.clearFileTimeModifications();
    return compilationCache.compile(project).then(function () {
        if (!project.totalBundle)
            bb.updateSystemJsByCC(compilationCache, project.writeFileCallback);
        bb.updateIndexHtml(project);
    }).then(function () {
        process.send({ command: "compileOk" });
    }, function (err) {
        process.send({ command: "compileFailed", param: err });
    });
}
exports.compile = compile;
