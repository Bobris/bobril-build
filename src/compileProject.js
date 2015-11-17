var bb = require('../index');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require("fs");
var ts = require("typescript");
function createProjectFromDir(path) {
    var project = {
        dir: path.replace(/\\/g, '/'),
        main: null,
        mainJsFile: null,
        options: { module: 1 /* CommonJS */, target: 1 /* ES5 */, skipDefaultLibCheck: true }
    };
    return project;
}
exports.createProjectFromDir = createProjectFromDir;
function autodetectMainTs(project) {
    var searchMainTsList = ['index.ts', 'app.ts', 'lib.ts', 'src/index.ts', 'src/app.ts', 'src/lib.ts'];
    project.mainAutoDetected = true;
    for (var i = 0; i < searchMainTsList.length; i++) {
        var fn = searchMainTsList[i];
        if (fs.existsSync(path.join(project.dir, fn))) {
            project.main = fn;
            project.mainJsFile = fn.replace(/\.ts$/, '.js');
            project.logCallback("Info: Main found " + fn);
            return true;
        }
    }
    project.logCallback('Error: Main not found. Searched: ' + searchMainTsList.join(', '));
    return false;
}
function refreshProjectFromPackageJson(project) {
    var projectJsonFullPath = path.join(project.dir, 'package.json');
    var projectJsonModified = bb.fileModifiedTime(projectJsonFullPath);
    if (projectJsonModified === project.projectJsonTime && !project.mainAutoDetected) {
        return project.main !== null;
    }
    var packageJson = null;
    try {
        packageJson = fs.readFileSync(projectJsonFullPath, 'utf-8');
    }
    catch (err) {
        project.logCallback('Cannot read package.json ' + err + '. Autodetecting main ts file.');
        return autodetectMainTs(project);
    }
    project.projectJsonTime = projectJsonModified;
    var packageObj = null;
    try {
        packageObj = JSON.parse(packageJson);
    }
    catch (err) {
        project.logCallback('Package.json cannot be parsed. ' + err);
        return false;
    }
    if (packageObj.typescript && typeof packageObj.typescript.main === 'string') {
        var main = packageObj.typescript.main;
        if (!fs.existsSync(main)) {
            project.logCallback('Package.json typescript.main is ' + main + ', but this file does not exists. Aborting.');
            return false;
        }
        project.main = main;
        project.mainJsFile = main.replace(/\.ts$/, '.js');
    }
    else {
        project.logCallback('Package.json missing typescript.main. Autodetecting main ts file.');
        if (!autodetectMainTs(project))
            return false;
        if (project == null)
            return null;
    }
    var bobrilSection = packageObj.bobril;
    if (bobrilSection == null)
        return true;
    if (typeof bobrilSection.title === 'string') {
        project.htmlTitle = bobrilSection.title;
    }
    if (typeof bobrilSection.dir === 'string') {
        project.outputDir = bobrilSection.dir;
    }
    return true;
}
exports.refreshProjectFromPackageJson = refreshProjectFromPackageJson;
function compileProject(project) {
    var compilationCache = new bb.CompilationCache();
    var translationDb = new bb.TranslationDb();
    project.writeFileCallback = function (fn, b) {
        var fullname = path.join(project.outputDir, fn);
        console.log("Writing " + fullname);
        bb.mkpathsync(path.dirname(fullname));
        fs.writeFileSync(fullname, b);
    };
    compilationCache.clearFileTimeModifications();
    return compilationCache.compile(project).then(function () {
        if (!project.totalBundle)
            bb.updateSystemJsByCC(compilationCache, project.writeFileCallback);
        bb.updateIndexHtml(project);
    });
}
exports.compileProject = compileProject;
