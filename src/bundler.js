var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var uglify = require('uglifyjs');
function defaultResolveRequire(name, from, fileExists, readFile) {
    if (name[0] === '.') {
        var res = path.join(path.dirname(from), name);
        if (fileExists(res + '.js'))
            return res + '.js';
        if (fileExists(res))
            return res;
        return null;
    }
    var oldDir = null;
    var curDir = path.dirname(from);
    while (oldDir != curDir) {
        var tryName = path.join(curDir, 'node_modules', name, 'package.json');
        if (fileExists(tryName)) {
            var packageJson = readFile(tryName);
            var content = void 0;
            try {
                content = JSON.parse(packageJson);
                tryName = path.join(curDir, 'node_modules', name, content.main);
            }
            catch (err) {
                return null;
            }
            if (fileExists(tryName))
                return tryName;
            tryName = path.join(curDir, 'node_modules', name, 'index.js');
            if (fileExists(tryName))
                return tryName;
            return null;
        }
        oldDir = curDir;
        curDir = path.dirname(curDir);
    }
    if (fileExists(name + '.js'))
        return name + '.js';
    return null;
}
function check(name, order, stack, project, resolveRequire) {
    var cached = project.cache[name];
    if (cached === undefined) {
        var mod = project.checkFileModification(name);
        if (mod == null)
            return;
        var ast = uglify.parse(project.readContent(name));
        ast.figure_out_scope();
        cached = { name: name, astTime: mod, ast: ast, requires: [] };
        uglify.TreeWalker(function (node) {
            if (node instanceof uglify.AST_Call) {
                var call = node;
                function isRequire(symbolDef) {
                    return symbolDef.undeclared && symbolDef.global && symbolDef.name === 'require';
                }
                if (call.args.length === 1 && call.expression instanceof uglify.AST_SymbolRef && (isRequire(call.expression.thedef))) {
                    var arg = call.args[0];
                    if (arg instanceof uglify.AST_String) {
                    }
                }
            }
            return false;
        });
        project.cache[name] = cached;
    }
}
function bundle(project) {
    project.cache = project.cache || Object.create(null);
    var fileExists = function (name) { return project.checkFileModification(name) != null; };
    var readFile = function (name) { return project.readContent(name); };
    var lowResolveRequire = project.resolveRequire || defaultResolveRequire;
    var resolveRequire = function (name, from) {
        return lowResolveRequire(name, from, fileExists, readFile);
    };
    var order = [];
    var stack = [];
    project.getMainFiles().forEach(function (val) { return check(val, order, stack, project, resolveRequire); });
}
exports.bundle = bundle;
