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
function isRequire(symbolDef) {
    return symbolDef.undeclared && symbolDef.global && symbolDef.name === 'require';
}
function constParamOfCallRequire(node) {
    if (node instanceof uglify.AST_Call) {
        var call = node;
        if (call.args.length === 1 && call.expression instanceof uglify.AST_SymbolRef && (isRequire(call.expression.thedef))) {
            var arg = call.args[0];
            if (arg instanceof uglify.AST_String) {
                return arg.value;
            }
        }
    }
    return null;
}
function isExports(node) {
    if (node instanceof uglify.AST_SymbolRef) {
        var thedef = node.thedef;
        if (thedef.global && thedef.undeclared && thedef.name === 'exports')
            return true;
    }
    return false;
}
function matchPropKey(propAccess) {
    var name = propAccess.property;
    if (name instanceof uglify.AST_String) {
        name = name.value;
    }
    if (typeof name === 'string') {
        return name;
    }
    return undefined;
}
function paternAssignExports(node) {
    if (node instanceof uglify.AST_Assign) {
        var assign = node;
        if (assign.operator = "=") {
            if (assign.left instanceof uglify.AST_PropAccess) {
                var propAccess = assign.left;
                if (isExports(propAccess.expression)) {
                    var name_1 = matchPropKey(propAccess);
                    if (name_1 !== undefined) {
                        return {
                            name: name_1, value: assign.right
                        };
                    }
                }
            }
        }
    }
    return null;
}
function check(name, order, stack, project, resolveRequire) {
    var cached = project.cache[name];
    var mod = project.checkFileModification(name);
    if (cached === undefined || cached.astTime !== mod) {
        if (mod == null) {
            throw new Error('Cannot open ' + name);
        }
        var ast = uglify.parse(project.readContent(name));
        ast.figure_out_scope();
        cached = { name: name, astTime: mod, ast: ast, requires: [], exports: Object.create(null) };
        var exportsSymbol = ast.globals['exports'];
        var walker = new uglify.TreeWalker(function (node) {
            if (node instanceof uglify.AST_Block) {
                node.body = node.body.filter(function (stm) {
                    if (stm instanceof uglify.AST_SimpleStatement) {
                        var stmbody = stm.body;
                        var pea = paternAssignExports(stmbody);
                        if (pea) {
                            cached.exports[pea.name] = pea.value;
                            return false;
                        }
                    }
                    return true;
                });
            }
            var req = constParamOfCallRequire(node);
            if (req != null) {
                console.log(walker.parent(0).TYPE, walker.parent(1).TYPE, walker.parent(2).TYPE);
                var reqr = resolveRequire(req, name);
                if (reqr == null) {
                    throw new Error('require("' + req + '") not found from ' + name);
                }
                var parent_1 = walker.parent();
                if (parent_1 instanceof uglify.AST_VarDef) {
                    var vardef = parent_1;
                    vardef.name.thedef.bbRequirePath = reqr;
                }
                if (cached.requires.indexOf(reqr) < 0)
                    cached.requires.push(reqr);
            }
            return false;
        });
        ast.walk(walker);
        project.cache[name] = cached;
    }
    cached.requires.forEach(function (r) {
        if (stack.indexOf(r) >= 0)
            return;
        stack.push(r);
        check(r, order, stack, project, resolveRequire);
    });
    order.push(cached);
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
    var bundleAst = new uglify.AST_Toplevel({ body: [] });
    order.forEach(function (f) {
        var transformer = new uglify.TreeTransformer(null, function (node) {
            if (node instanceof uglify.AST_Toplevel) {
                bundleAst.body.push(node.body);
            }
            else if (node instanceof uglify.AST_VarDef) {
                var vardef = node;
                var thedef = vardef.name.thedef;
                if (thedef.bbRequirePath) {
                    vardef.value = null;
                }
            }
            else if (node instanceof uglify.AST_PropAccess) {
                var propAccess = node;
            }
            return undefined;
        });
        f.ast.transform(transformer);
    });
    var os = uglify.OutputStream({
        beautify: true
    });
    bundleAst.print(os);
    project.writeBundle(os.toString());
}
exports.bundle = bundle;
