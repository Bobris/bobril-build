var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var uglify = require('uglifyjs');
if (!Object.assign) {
    Object.defineProperty(Object, 'assign', {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (target) {
            'use strict';
            if (target === undefined || target === null) {
                throw new TypeError('Cannot convert first argument to object');
            }
            var to = Object(target);
            for (var i = 1; i < arguments.length; i++) {
                var nextSource = arguments[i];
                if (nextSource === undefined || nextSource === null) {
                    continue;
                }
                nextSource = Object(nextSource);
                var keysArray = Object.keys(nextSource);
                for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
                    var nextKey = keysArray[nextIndex];
                    var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
                    if (desc !== undefined && desc.enumerable) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
            return to;
        }
    });
}
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
        if (assign.operator === "=") {
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
function patternDefinePropertyExportsEsModule(call) {
    //Object.defineProperty(exports, "__esModule", { value: true });
    if (call.args.length === 3 && isExports(call.args[0])) {
        if (call.expression instanceof uglify.AST_PropAccess) {
            var exp = call.expression;
            if (matchPropKey(exp) === 'defineProperty') {
                if (exp.expression instanceof uglify.AST_SymbolRef) {
                    var symb = exp.expression;
                    if (symb.name === 'Object')
                        return true;
                }
            }
        }
    }
    return false;
}
function check(name, order, stack, project, resolveRequire) {
    var cached = project.cache[name.toLowerCase()];
    var mod = project.checkFileModification(name);
    var reexportDef = null;
    if (cached === undefined || cached.astTime !== mod) {
        if (mod == null) {
            throw new Error('Cannot open ' + name);
        }
        var ast = uglify.parse(project.readContent(name));
        //console.log(ast.print_to_string({ beautify: true }));
        ast.figure_out_scope();
        cached = { name: name, astTime: mod, ast: ast, requires: [], difficult: false, selfexports: Object.create(null), exports: null, reexportAll: [], reexport: Object.create(null) };
        if (ast.globals.has('module')) {
            cached.difficult = true;
            ast = uglify.parse("(function(){ var exports = {}; var module = { exports: exports }; " + project.readContent(name) + "\n__bbe['" + name + "']=module.exports; })();");
            cached.ast = ast;
            project.cache[name.toLowerCase()] = cached;
            order.push(cached);
            return;
        }
        var exportsSymbol = ast.globals['exports'];
        var walker = new uglify.TreeWalker(function (node, descend) {
            if (node instanceof uglify.AST_Block) {
                descend();
                node.body = node.body.map(function (stm) {
                    if (stm instanceof uglify.AST_SimpleStatement) {
                        var stmbody = stm.body;
                        var pea = paternAssignExports(stmbody);
                        if (pea) {
                            if (pea.value instanceof uglify.AST_PropAccess) {
                                var propAccess = pea.value;
                                if (propAccess.expression instanceof uglify.AST_SymbolRef) {
                                    var symb = propAccess.expression;
                                    var thedef = symb.thedef;
                                    if (thedef.bbRequirePath) {
                                        var extf = cached.reexport[thedef.bbRequirePath.toLowerCase()];
                                        if (extf === undefined) {
                                            extf = Object.create(null);
                                            cached.reexport[thedef.bbRequirePath.toLowerCase()] = extf;
                                        }
                                        var extn = matchPropKey(propAccess);
                                        if (extn) {
                                            extf[pea.name] = extn;
                                            return null;
                                        }
                                    }
                                }
                            }
                            if (!(pea.value instanceof uglify.AST_SymbolRef)) {
                                var newName = '__export_' + pea.name;
                                var newVar = new uglify.AST_Var({
                                    start: stmbody.start,
                                    end: stmbody.end,
                                    definitions: [
                                        new uglify.AST_VarDef({ name: new uglify.AST_SymbolVar({ name: newName, start: stmbody.start, end: stmbody.end }), value: pea.value })
                                    ]
                                });
                                var symb = new uglify.SymbolDef(ast, ast.variables.size(), newVar.definitions[0].name);
                                symb.undeclared = false;
                                ast.variables.set(newName, symb);
                                newVar.definitions[0].name.thedef = symb;
                                stm.body = newVar;
                                cached.selfexports[pea.name] = new uglify.AST_SymbolRef({ name: newName, thedef: symb });
                                return newVar;
                            }
                            cached.selfexports[pea.name] = pea.value;
                            return null;
                        }
                        if (stmbody instanceof uglify.AST_Call) {
                            var call = stmbody;
                            if (patternDefinePropertyExportsEsModule(call))
                                return null;
                            if (call.args.length === 1 && call.expression instanceof uglify.AST_SymbolRef) {
                                var symb = call.expression;
                                if (symb.thedef === reexportDef) {
                                    var req_1 = constParamOfCallRequire(call.args[0]);
                                    if (req_1 != null) {
                                        var reqr = resolveRequire(req_1, name);
                                        if (reqr == null) {
                                            throw new Error('require("' + req_1 + '") not found from ' + name);
                                        }
                                        if (cached.requires.indexOf(reqr) < 0)
                                            cached.requires.push(reqr);
                                        if (cached.reexportAll.indexOf(reqr) < 0)
                                            cached.reexportAll.push(reqr);
                                        return null;
                                    }
                                }
                            }
                        }
                    }
                    else if (stm instanceof uglify.AST_Defun) {
                        var fnc = stm;
                        if (fnc.name.name === '__export') {
                            reexportDef = fnc.name.thedef;
                            return null;
                        }
                    }
                    return stm;
                }).filter(function (stm) {
                    return stm != null;
                });
                return true;
            }
            if (node instanceof uglify.AST_PropAccess) {
                if (!(walker.parent() instanceof uglify.AST_Assign) || !(walker.parent(1) instanceof uglify.AST_SimpleStatement)) {
                    var propAccess = node;
                    if (isExports(propAccess.expression)) {
                        var key = matchPropKey(propAccess);
                        if (key) {
                            if (cached.selfexports[key])
                                return true;
                            var newName = '__export_' + key;
                            var newVar = new uglify.AST_Var({
                                start: node.start,
                                end: node.end,
                                definitions: [
                                    new uglify.AST_VarDef({ name: new uglify.AST_SymbolVar({ name: newName, start: node.start, end: node.end }), value: null })
                                ]
                            });
                            var symb = new uglify.SymbolDef(ast, ast.variables.size(), newVar.definitions[0].name);
                            symb.undeclared = false;
                            ast.variables.set(newName, symb);
                            newVar.definitions[0].name.thedef = symb;
                            var newStm = new uglify.AST_SimpleStatement({ body: newVar });
                            ast.body.unshift(newStm);
                            cached.selfexports[key] = new uglify.AST_SymbolRef({ name: newName, thedef: symb });
                            return true;
                        }
                    }
                }
            }
            var req = constParamOfCallRequire(node);
            if (req != null) {
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
        project.cache[name.toLowerCase()] = cached;
    }
    cached.requires.forEach(function (r) {
        if (stack.indexOf(r) >= 0)
            return;
        stack.push(r);
        check(r, order, stack, project, resolveRequire);
    });
    cached.exports = Object.assign(Object.create(null), cached.selfexports);
    cached.reexportAll.forEach(function (exp) {
        exp = exp.toLowerCase();
        Object.assign(cached.exports, project.cache[exp].exports || project.cache[exp].selfexports);
    });
    var reex = Object.keys(cached.reexport);
    reex.forEach(function (exp) {
        var expm = project.cache[exp].exports || project.cache[exp].selfexports;
        var exps = cached.reexport[exp];
        var expsn = Object.keys(exps);
        expsn.forEach(function (nn) {
            cached.exports[nn] = expm[exps[nn]];
        });
    });
    order.push(cached);
}
function renameSymbol(node) {
    if (node instanceof uglify.AST_Symbol) {
        var symb = node;
        if (symb.thedef == null)
            return node;
        var rename = symb.thedef.bbRename;
        if (rename !== undefined) {
            symb = symb.clone();
            symb.name = rename;
            symb.thedef = undefined;
            symb.scope = undefined;
            return symb;
        }
    }
    return node;
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
    var bundleAst = uglify.parse('(function(){})()');
    var bodyAst = bundleAst.body[0].body.expression.body;
    var topLevelNames = Object.create(null);
    var wasSomeDifficult = false;
    order.forEach(function (f) {
        if (f.difficult) {
            if (!wasSomeDifficult) {
                var ast = uglify.parse('var __bbe={};');
                bodyAst.push.apply(bodyAst, ast.body);
                wasSomeDifficult = true;
            }
            bodyAst.push.apply(bodyAst, f.ast.body);
            return;
        }
        var suffix = f.name;
        if (suffix.lastIndexOf('/') >= 0)
            suffix = suffix.substr(suffix.lastIndexOf('/') + 1);
        if (suffix.indexOf('.') >= 0)
            suffix = suffix.substr(0, suffix.indexOf('.'));
        f.ast.variables.each(function (symb, name) {
            if (symb.bbRequirePath)
                return;
            var newname = name;
            if (topLevelNames[name] !== undefined) {
                var index = 0;
                do {
                    index++;
                    newname = name + "_" + suffix;
                    if (index > 1)
                        newname += '' + index;
                } while (topLevelNames[newname] !== undefined);
                symb.bbRename = newname;
            }
            else {
                symb.bbRename = undefined;
            }
            topLevelNames[newname] = true;
        });
        var transformer = new uglify.TreeTransformer(function (node) {
            if (node instanceof uglify.AST_Label) {
                return node;
            }
            if (node instanceof uglify.AST_Symbol) {
                var symb = node;
                if (symb.thedef == null)
                    return undefined;
                var rename = symb.thedef.bbRename;
                if (rename !== undefined) {
                    symb = symb.clone();
                    symb.name = rename;
                    symb.thedef = undefined;
                    symb.scope = undefined;
                    return symb;
                }
            }
            if (node instanceof uglify.AST_PropAccess) {
                var propAccess = node;
                if (isExports(propAccess.expression)) {
                    var key = matchPropKey(propAccess);
                    if (key) {
                        var symb = f.selfexports[key];
                        if (symb)
                            return renameSymbol(symb);
                    }
                }
            }
            return undefined;
        }, function (node) {
            if (node instanceof uglify.AST_Block) {
                var block = node;
                block.body = block.body.filter(function (stm) {
                    if (stm instanceof uglify.AST_Var) {
                        var varn = stm;
                        if (varn.definitions.length === 0)
                            return false;
                    }
                    return true;
                });
            }
            if (node instanceof uglify.AST_Toplevel) {
                var topLevel = node;
                bodyAst.push.apply(bodyAst, topLevel.body);
            }
            else if (node instanceof uglify.AST_Var) {
                var varn = node;
                varn.definitions = varn.definitions.filter(function (vd) {
                    return vd.name != null;
                });
            }
            else if (node instanceof uglify.AST_VarDef) {
                var vardef = node;
                var thedef = vardef.name.thedef;
                if (thedef && thedef.bbRequirePath) {
                    var extf = project.cache[thedef.bbRequirePath.toLowerCase()];
                    if (extf.difficult) {
                        vardef.value = uglify.parse("__bbe['" + thedef.bbRequirePath + "']").body[0].body;
                    }
                    else {
                        vardef.value = null;
                        vardef.name = null;
                    }
                }
            }
            else if (node instanceof uglify.AST_PropAccess) {
                var propAccess = node;
                if (propAccess.expression instanceof uglify.AST_SymbolRef) {
                    var symb = propAccess.expression;
                    var thedef = symb.thedef;
                    if (thedef && thedef.bbRequirePath) {
                        var extf = project.cache[thedef.bbRequirePath.toLowerCase()];
                        if (!extf.difficult) {
                            var extn = matchPropKey(propAccess);
                            if (extn) {
                                var asts = extf.exports[extn];
                                if (asts) {
                                    return renameSymbol(asts);
                                }
                                throw new Error('In ' + thedef.bbRequirePath + ' cannot find ' + extn);
                            }
                        }
                    }
                }
            }
            return undefined;
        });
        f.ast.transform(transformer);
    });
    if (project.compress !== false) {
        bundleAst.figure_out_scope();
        var compressor = uglify.Compressor({ warnings: false, global_defs: project.defines });
        bundleAst = bundleAst.transform(compressor);
    }
    if (project.mangle !== false) {
        bundleAst.figure_out_scope();
        bundleAst.mangle_names();
    }
    var os = uglify.OutputStream({
        beautify: project.beautify === true
    });
    bundleAst.print(os);
    project.writeBundle(os.toString());
}
exports.bundle = bundle;
