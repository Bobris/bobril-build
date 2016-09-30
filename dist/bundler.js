"use strict";
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
const uglify = require('uglify-js');
const simpleHelpers_1 = require('./simpleHelpers');
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
        let res = path.join(path.dirname(from), name);
        if (fileExists(res + '.js'))
            return res + '.js';
        if (fileExists(res))
            return res;
        return null;
    }
    let oldDir = null;
    let curDir = path.dirname(from);
    while (oldDir != curDir) {
        let tryName = path.join(curDir, 'node_modules', name, 'package.json');
        if (fileExists(tryName)) {
            let packageJson = readFile(tryName);
            let content;
            try {
                content = JSON.parse(packageJson);
                tryName = path.join(curDir, 'node_modules', name, content.main || "index.js");
            }
            catch (err) {
                return null;
            }
            if (fileExists(tryName))
                return tryName;
            tryName = path.join(curDir, 'node_modules', name, 'index.js');
            if (fileExists(tryName))
                return tryName;
            console.log("Ignoring invalid module " + path.join(curDir, 'node_modules', name));
        }
        oldDir = curDir;
        curDir = path.dirname(curDir);
    }
    if (fileExists(name + '.js'))
        return name + '.js';
    return null;
}
function isRequire(symbolDef) {
    return symbolDef != null && symbolDef.undeclared && symbolDef.global && symbolDef.name === 'require';
}
function constParamOfCallRequire(node) {
    if (node instanceof uglify.AST_Call) {
        let call = node;
        if (call.args.length === 1 && call.expression instanceof uglify.AST_SymbolRef && (isRequire(call.expression.thedef))) {
            let arg = call.args[0];
            if (arg instanceof uglify.AST_String) {
                return arg.value;
            }
        }
    }
    return null;
}
function isExports(node) {
    if (node instanceof uglify.AST_SymbolRef) {
        let thedef = node.thedef;
        // thedef could be null because it could be already renamed/cloned ref
        if (thedef && thedef.global && thedef.undeclared && thedef.name === 'exports')
            return true;
    }
    return false;
}
function isExtend(node) {
    if (node instanceof uglify.AST_Var) {
        let vardefs = node.definitions;
        if (vardefs && vardefs.length === 1) {
            if (vardefs[0].name.name === "__extends") {
                return true;
            }
        }
    }
    return false;
}
function matchPropKey(propAccess) {
    let name = propAccess.property;
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
        let assign = node;
        if (assign.operator === "=") {
            if (assign.left instanceof uglify.AST_PropAccess) {
                let propAccess = assign.left;
                if (isExports(propAccess.expression)) {
                    let name = matchPropKey(propAccess);
                    if (name !== undefined) {
                        return {
                            name: name, value: assign.right
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
            let exp = call.expression;
            if (matchPropKey(exp) === 'defineProperty') {
                if (exp.expression instanceof uglify.AST_SymbolRef) {
                    let symb = exp.expression;
                    if (symb.name === 'Object')
                        return true;
                }
            }
        }
    }
    return false;
}
function isConstantSymbolRef(node) {
    if (node instanceof uglify.AST_SymbolRef) {
        let def = node.thedef;
        if (def.undeclared)
            return false;
        if (def.orig.length !== 1)
            return false;
        if (def.orig[0] instanceof uglify.AST_SymbolDefun)
            return true;
    }
    return false;
}
function check(name, order, visited, project, resolveRequire) {
    let cached = project.cache[name.toLowerCase()];
    let mod = project.checkFileModification(name);
    let reexportDef = null;
    if (cached === undefined || cached.astTime !== mod) {
        if (mod == null) {
            throw new Error('Cannot open ' + name);
        }
        let fileContent = project.readContent(name);
        //console.log("============== START " + name);
        //console.log(fileContent);
        let ast = uglify.parse(fileContent);
        //console.log(ast.print_to_string({ beautify: true }));
        ast.figure_out_scope();
        cached = { name: name, astTime: mod, ast: ast, requires: [], difficult: false, hasExtend: false, selfexports: [], exports: null, pureFuncs: Object.create(null) };
        let pureMatch = fileContent.match(/^\/\/ PureFuncs:.+/gm);
        if (pureMatch) {
            pureMatch.forEach(m => {
                m.toString().substr(m.indexOf(":") + 1).split(',').forEach(s => {
                    if (s.length === 0)
                        return;
                    cached.pureFuncs[s.trim()] = true;
                });
            });
        }
        if (ast.globals.has('module')) {
            cached.difficult = true;
            ast = uglify.parse(`(function(){ var exports = {}; var module = { exports: exports }; ${project.readContent(name)}
__bbe['${name}']=module.exports; }).call(window);`);
            cached.ast = ast;
            project.cache[name.toLowerCase()] = cached;
            order.push(cached);
            return;
        }
        let exportsSymbol = ast.globals['exports'];
        let unshiftToBody = [];
        let selfExpNames = Object.create(null);
        let varDecls = null;
        let walker = new uglify.TreeWalker((node, descend) => {
            if (node instanceof uglify.AST_Block) {
                descend();
                node.body = node.body.map((stm) => {
                    if (stm instanceof uglify.AST_Directive) {
                        // skip "use strict";
                        return null;
                    }
                    else if (stm instanceof uglify.AST_SimpleStatement) {
                        let stmbody = stm.body;
                        let pea = paternAssignExports(stmbody);
                        if (pea) {
                            let newName = '__export_' + pea.name;
                            if (selfExpNames[pea.name] && stmbody instanceof uglify.AST_Assign) {
                                stmbody.left = new uglify.AST_SymbolRef({ name: newName, thedef: ast.variables.get(newName) });
                                return stm;
                            }
                            if (isConstantSymbolRef(pea.value)) {
                                selfExpNames[pea.name] = true;
                                let def = pea.value.thedef;
                                def.bbAlwaysClone = true;
                                cached.selfexports.push({ name: pea.name, node: pea.value });
                                return null;
                            }
                            let newVar = new uglify.AST_Var({
                                start: stmbody.start,
                                end: stmbody.end,
                                definitions: [
                                    new uglify.AST_VarDef({ name: new uglify.AST_SymbolVar({ name: newName, start: stmbody.start, end: stmbody.end }), value: pea.value })
                                ]
                            });
                            let symb = ast.def_variable(newVar.definitions[0].name);
                            symb.undeclared = false;
                            symb.bbAlwaysClone = true;
                            selfExpNames[pea.name] = true;
                            cached.selfexports.push({ name: pea.name, node: new uglify.AST_SymbolRef({ name: newName, thedef: symb }) });
                            return newVar;
                        }
                        if (stmbody instanceof uglify.AST_Call) {
                            let call = stmbody;
                            if (patternDefinePropertyExportsEsModule(call))
                                return null;
                            if (call.args.length === 1 && call.expression instanceof uglify.AST_SymbolRef) {
                                let symb = call.expression;
                                if (symb.thedef === reexportDef) {
                                    let req = constParamOfCallRequire(call.args[0]);
                                    if (req != null) {
                                        let reqr = resolveRequire(req, name);
                                        if (reqr == null) {
                                            throw new Error('require("' + req + '") not found from ' + name);
                                        }
                                        if (cached.requires.indexOf(reqr) < 0)
                                            cached.requires.push(reqr);
                                        cached.selfexports.push({ reexport: reqr });
                                        return null;
                                    }
                                }
                            }
                        }
                    }
                    else if (stm instanceof uglify.AST_Defun) {
                        let fnc = stm;
                        if (fnc.name.name === '__export') {
                            reexportDef = fnc.name.thedef;
                            return null;
                        }
                    }
                    else if (isExtend(stm)) {
                        cached.hasExtend = true;
                        return null;
                    }
                    return stm;
                }).filter((stm) => {
                    return stm != null;
                });
                return true;
            }
            if (node instanceof uglify.AST_PropAccess) {
                if (!(walker.parent() instanceof uglify.AST_Assign) || !(walker.parent(1) instanceof uglify.AST_SimpleStatement)) {
                    let propAccess = node;
                    if (isExports(propAccess.expression)) {
                        let key = matchPropKey(propAccess);
                        if (key) {
                            if (selfExpNames[key])
                                return false;
                            let newName = '__export_' + key;
                            if (varDecls == null) {
                                let vartop = uglify.parse('var a;');
                                let stm = vartop.body[0];
                                unshiftToBody.push(stm);
                                varDecls = stm.definitions;
                                varDecls.pop();
                            }
                            let symbVar = new uglify.AST_SymbolVar({ name: newName, start: node.start, end: node.end });
                            varDecls.push(new uglify.AST_VarDef({ name: symbVar, value: null }));
                            let symb = ast.def_variable(symbVar);
                            symb.undeclared = false;
                            symb.bbAlwaysClone = true;
                            selfExpNames[key] = true;
                            cached.selfexports.push({ name: key, node: new uglify.AST_SymbolRef({ name: newName, thedef: symb }) });
                            return false;
                        }
                    }
                }
            }
            let req = constParamOfCallRequire(node);
            if (req != null) {
                let reqr = resolveRequire(req, name);
                if (reqr == null) {
                    throw new Error('require("' + req + '") not found from ' + name);
                }
                let parent = walker.parent();
                if (parent instanceof uglify.AST_VarDef) {
                    let vardef = parent;
                    vardef.name.thedef.bbRequirePath = reqr;
                }
                if (cached.requires.indexOf(reqr) < 0)
                    cached.requires.push(reqr);
            }
            return false;
        });
        ast.walk(walker);
        ast.body.unshift(...unshiftToBody);
        project.cache[name.toLowerCase()] = cached;
    }
    cached.requires.forEach((r) => {
        if (visited.indexOf(r) >= 0)
            return;
        visited.push(r);
        check(r, order, visited, project, resolveRequire);
    });
    cached.exports = Object.create(null);
    cached.selfexports.forEach(exp => {
        if (exp.name) {
            cached.exports[exp.name] = exp.node;
        }
        else if (exp.reexport) {
            let reexModule = project.cache[exp.reexport.toLowerCase()];
            if (reexModule.exports) {
                Object.assign(cached.exports, reexModule.exports);
            }
            else {
                reexModule.selfexports.forEach(exp2 => {
                    if (exp2.name) {
                        cached.exports[exp2.name] = exp2.node;
                    }
                });
            }
        }
    });
    order.push(cached);
}
function renameSymbol(node) {
    if (node instanceof uglify.AST_Symbol) {
        let symb = node;
        if (symb.thedef == null)
            return node;
        let rename = symb.thedef.bbRename;
        if (rename !== undefined || symb.thedef.bbAlwaysClone) {
            symb = symb.clone();
            if (rename !== undefined) {
                symb.name = rename;
            }
            symb.thedef = undefined;
            symb.scope = undefined;
        }
        return symb;
    }
    return node;
}
function bundle(project) {
    project.cache = project.cache || Object.create(null);
    let fileExists = (name) => project.checkFileModification(name) != null;
    let readFile = (name) => project.readContent(name);
    let lowResolveRequire = project.resolveRequire || defaultResolveRequire;
    let resolveRequire = (name, from) => {
        return lowResolveRequire(name, from, fileExists, readFile);
    };
    let order = [];
    let visited = [];
    let pureFuncs = Object.create(null);
    project.getMainFiles().forEach((val) => {
        if (visited.indexOf(val) >= 0)
            return;
        visited.push(val);
        check(val, order, visited, project, resolveRequire);
    });
    let bundleAst = uglify.parse('(function(){"use strict";})()');
    let bodyAst = bundleAst.body[0].body.expression.body;
    let topLevelNames = Object.create(null);
    let hasExtend = false;
    let wasSomeDifficult = false;
    order.forEach((f) => {
        if (f.hasExtend && !hasExtend) {
            // Simplify and dedup __extends
            hasExtend = true;
            topLevelNames["__extends"] = true;
            bodyAst.push(...uglify.parse('var __extends=function(d, b){function __(){this.constructor=d;}for(var p in b)b.hasOwnProperty(p)&&(d[p]=b[p]);d.prototype=null===b?Object.create(b):(__.prototype=b.prototype,new __());}').body);
        }
        if (f.difficult) {
            if (!wasSomeDifficult) {
                let ast = uglify.parse('var __bbe={};');
                bodyAst.push(...ast.body);
                wasSomeDifficult = true;
            }
            bodyAst.push(...f.ast.body);
            return;
        }
        let suffix = f.name;
        if (suffix.lastIndexOf('/') >= 0)
            suffix = suffix.substr(suffix.lastIndexOf('/') + 1);
        if (suffix.indexOf('.') >= 0)
            suffix = suffix.substr(0, suffix.indexOf('.'));
        suffix = suffix.replace(/-/, "_");
        let walker = new uglify.TreeWalker((node, descend) => {
            if (node instanceof uglify.AST_Scope) {
                node.variables.each((symb, name) => {
                    if (symb.bbRequirePath)
                        return;
                    let newname = symb.bbRename || name;
                    if ((topLevelNames[name] !== undefined) && (name !== "__extends") && (node === f.ast || node.enclosed.some(enclSymb => topLevelNames[enclSymb.name] !== undefined))) {
                        let index = 0;
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
                    if (node === f.ast) {
                        if (name in f.pureFuncs)
                            pureFuncs[newname] = true;
                        topLevelNames[newname] = true;
                    }
                });
            }
            return false;
        });
        f.ast.walk(walker);
    });
    order.forEach((f) => {
        if (f.difficult)
            return;
        let transformer = new uglify.TreeTransformer((node) => {
            if (node instanceof uglify.AST_Label) {
                return node;
            }
            if (node instanceof uglify.AST_Symbol) {
                let symb = node;
                if (symb.thedef == null)
                    return undefined;
                let rename = symb.thedef.bbRename;
                if (rename !== undefined || symb.thedef.bbAlwaysClone) {
                    symb = symb.clone();
                    if (rename !== undefined)
                        symb.name = rename;
                    symb.thedef = undefined;
                    symb.scope = undefined;
                    return symb;
                }
                let reqPath = symb.thedef.bbRequirePath;
                if (reqPath !== undefined && !(transformer.parent() instanceof uglify.AST_PropAccess)) {
                    let p = transformer.parent();
                    if (p instanceof uglify.AST_VarDef && p.name === symb)
                        return undefined;
                    let properties = [];
                    let extf = project.cache[reqPath.toLowerCase()];
                    if (!extf.difficult) {
                        let keys = Object.keys(extf.exports);
                        keys.forEach(key => {
                            properties.push(new uglify.AST_ObjectKeyVal({ quote: "'", key: key, value: renameSymbol(extf.exports[key]) }));
                        });
                        return new uglify.AST_Object({ properties: properties });
                    }
                }
            }
            if (node instanceof uglify.AST_PropAccess) {
                let propAccess = node;
                if (isExports(propAccess.expression)) {
                    let key = matchPropKey(propAccess);
                    if (key) {
                        let symb = f.exports[key];
                        if (symb)
                            return renameSymbol(symb);
                    }
                }
            }
            return undefined;
        }, (node) => {
            if (node instanceof uglify.AST_Block) {
                let block = node;
                block.body = block.body.filter((stm) => {
                    if (stm instanceof uglify.AST_Var) {
                        let varn = stm;
                        if (varn.definitions.length === 0)
                            return false;
                    }
                    else if (stm instanceof uglify.AST_SimpleStatement) {
                        let stmbody = stm.body;
                        if (constParamOfCallRequire(stmbody) != null)
                            return false;
                    }
                    return true;
                });
            }
            if (node instanceof uglify.AST_Toplevel) {
                let topLevel = node;
                bodyAst.push(...topLevel.body);
            }
            else if (node instanceof uglify.AST_Var) {
                let varn = node;
                varn.definitions = varn.definitions.filter((vd) => {
                    return vd.name != null;
                });
            }
            else if (node instanceof uglify.AST_VarDef) {
                let vardef = node;
                let thedef = vardef.name.thedef;
                if (thedef && thedef.bbRequirePath) {
                    let extf = project.cache[thedef.bbRequirePath.toLowerCase()];
                    if (extf.difficult) {
                        vardef.value = uglify.parse(`__bbe['${thedef.bbRequirePath}']`).body[0].body;
                    }
                    else {
                        vardef.value = null;
                        vardef.name = null;
                    }
                }
            }
            else if (node instanceof uglify.AST_PropAccess) {
                let propAccess = node;
                if (propAccess.expression instanceof uglify.AST_SymbolRef) {
                    let symb = propAccess.expression;
                    let thedef = symb.thedef;
                    if (thedef && thedef.bbRequirePath) {
                        let extf = project.cache[thedef.bbRequirePath.toLowerCase()];
                        if (!extf.difficult) {
                            let extn = matchPropKey(propAccess);
                            if (extn) {
                                let asts = extf.exports[extn];
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
        let compressor = uglify.Compressor({
            hoist_funs: false,
            warnings: false, global_defs: project.defines, pure_funcs: (call) => {
                if (call.expression instanceof uglify.AST_SymbolRef) {
                    let symb = call.expression;
                    if (symb.thedef.scope.parent_scope != null && symb.thedef.scope.parent_scope.parent_scope == null) {
                        if (symb.name in pureFuncs)
                            return false;
                    }
                    return true;
                }
                return true;
            }
        });
        bundleAst = bundleAst.transform(compressor);
    }
    if (project.mangle !== false) {
        bundleAst.figure_out_scope();
        let rootScope = null;
        let walker = new uglify.TreeWalker((n) => {
            if (n !== bundleAst && n instanceof uglify.AST_Scope) {
                rootScope = n;
                return true;
            }
            return false;
        });
        bundleAst.walk(walker);
        rootScope.uses_eval = false;
        rootScope.uses_with = false;
        bundleAst.mangle_names();
    }
    let os = uglify.OutputStream({
        beautify: project.beautify === true
    });
    bundleAst.print(os);
    let out = os.toString();
    if (project.compress === false) {
        out = simpleHelpers_1.globalDefines(project.defines) + out;
    }
    project.writeBundle(out);
}
exports.bundle = bundle;
//# sourceMappingURL=bundler.js.map