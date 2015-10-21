import * as fs from "fs";
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as pathUtils from './pathUtils';
import * as uglify from 'uglifyjs';

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

export interface IFileForBundle {
    name: string;
    astTime: number;
    ast: uglify.IAstToplevel;
    requires: string[];
    // it is not really TypeScript converted to commonjs
    difficult: boolean;
    selfexports: { [name: string]: uglify.IAstNode };
    exports: { [name: string]: uglify.IAstNode };
    reexportAll: string[];
    reexport: {
        [from: string]: { [name: string]: string }
    };
}

export interface IBundleProject {
    // return in Date.now() units or null if does not exist 
    checkFileModification(name: string): number;
    readContent(name: string): string;
    getMainFiles(): string[];
    writeBundle(content: string);
    resolveRequire?(name: string, from: string, fileExists: (name: string) => boolean, readFile: (name: string) => string): string;
    // default true
    compress?: boolean;
    // default true
    mangle?: boolean;
    // default false
    beautify?: boolean;
    defines?: { [name: string]: any };

    cache?: { [name: string]: IFileForBundle };
}

interface ISymbolDef extends uglify.ISymbolDef {
    bbRequirePath?: string;
    bbRename?: string;
}

function defaultResolveRequire(name: string, from: string, fileExists: (name: string) => boolean, readFile: (name: string) => string): string {
    if (name[0] === '.') {
        let res = path.join(path.dirname(from), name);
        if (fileExists(res + '.js')) return res + '.js';
        if (fileExists(res)) return res;
        return null;
    }
    let oldDir = null;
    let curDir = path.dirname(from);
    while (oldDir != curDir) {
        let tryName = path.join(curDir, 'node_modules', name, 'package.json');
        if (fileExists(tryName)) {
            let packageJson = readFile(tryName);
            let content: any;
            try {
                content = JSON.parse(packageJson);
                tryName = path.join(curDir, 'node_modules', name, (<any>content).main);
            } catch (err) {
                return null;
            }
            if (fileExists(tryName)) return tryName;
            tryName = path.join(curDir, 'node_modules', name, 'index.js');
            if (fileExists(tryName)) return tryName;
            return null;
        }
        oldDir = curDir;
        curDir = path.dirname(curDir);
    }
    if (fileExists(name + '.js')) return name + '.js';
    return null;
}

function isRequire(symbolDef: uglify.ISymbolDef) {
    return symbolDef.undeclared && symbolDef.global && symbolDef.name === 'require';
}

function constParamOfCallRequire(node: uglify.IAstNode): string {
    if (node instanceof uglify.AST_Call) {
        let call = <uglify.IAstCall>node;
        if (call.args.length === 1 && call.expression instanceof uglify.AST_SymbolRef && (isRequire((<uglify.IAstSymbolRef>call.expression).thedef))) {
            let arg = call.args[0];
            if (arg instanceof uglify.AST_String) {
                return (<uglify.IAstString>arg).value;
            }
        }
    }
    return null;
}


function isExports(node: uglify.IAstNode) {
    if (node instanceof uglify.AST_SymbolRef) {
        let thedef = (<uglify.IAstSymbolRef>node).thedef;
        if (thedef.global && thedef.undeclared && thedef.name === 'exports')
            return true;
    }
    return false;
}

function matchPropKey(propAccess: uglify.IAstPropAccess): string {
    let name = propAccess.property;
    if (name instanceof uglify.AST_String) {
        name = (<uglify.IAstString>name).value;
    }
    if (typeof name === 'string') {
        return name;
    }
    return undefined;
}

function paternAssignExports(node: uglify.IAstNode): { name: string, value: uglify.IAstNode } {
    if (node instanceof uglify.AST_Assign) {
        let assign = <uglify.IAstAssign>node;
        if (assign.operator === "=") {
            if (assign.left instanceof uglify.AST_PropAccess) {
                let propAccess = (<uglify.IAstPropAccess>assign.left);
                if (isExports(propAccess.expression)) {
                    let name = matchPropKey(propAccess);
                    if (name !== undefined) {
                        return {
                            name, value: assign.right
                        };
                    }
                }
            }
        }
    }
    return null;
}

function patternDefinePropertyExportsEsModule(call: uglify.IAstCall) {
    //Object.defineProperty(exports, "__esModule", { value: true });
    if (call.args.length === 3 && isExports(call.args[0])) {
        if (call.expression instanceof uglify.AST_PropAccess) {
            let exp = <uglify.IAstPropAccess>call.expression;
            if (matchPropKey(exp) === 'defineProperty') {
                if (exp.expression instanceof uglify.AST_SymbolRef) {
                    let symb = <uglify.IAstSymbolRef>exp.expression;
                    if (symb.name === 'Object')
                        return true;
                }
            }
        }
    }
    return false;
}

function check(name: string, order: IFileForBundle[], stack: string[], project: IBundleProject, resolveRequire: (name: string, from: string) => string) {
    let cached: IFileForBundle = project.cache[name.toLowerCase()];
    let mod = project.checkFileModification(name);
    let reexportDef: uglify.ISymbolDef = null;
    if (cached === undefined || cached.astTime !== mod) {
        if (mod == null) {
            throw new Error('Cannot open ' + name);
        }
        let ast = uglify.parse(project.readContent(name));
        ast.figure_out_scope();
        cached = { name, astTime: mod, ast, requires: [], difficult:false, selfexports: Object.create(null), exports: null, reexportAll: [], reexport: Object.create(null) };
        if (ast.globals.has('module')) {
            cached.difficult = true;
            ast = uglify.parse(`(function(){ var exports = {}; var module = { exports: exports }; ${project.readContent(name)}
__bbe['${name}']=module.exports; })();`);
            cached.ast = ast;
            project.cache[name.toLowerCase()] = cached;
            order.push(cached);
            return;
        }
        let exportsSymbol = ast.globals['exports'];
        let walker = new uglify.TreeWalker((node: uglify.IAstNode, descend: () => void) => {
            if (node instanceof uglify.AST_Block) {
                descend();
                (<uglify.IAstBlock>node).body = (<uglify.IAstBlock>node).body.map((stm): uglify.IAstNode => {
                    if (stm instanceof uglify.AST_SimpleStatement) {
                        let stmbody = (<uglify.IAstSimpleStatement>stm).body;
                        let pea = paternAssignExports(stmbody);
                        if (pea) {
                            if (pea.value instanceof uglify.AST_PropAccess) {
                                let propAccess = <uglify.IAstPropAccess>pea.value;
                                if (propAccess.expression instanceof uglify.AST_SymbolRef) {
                                    let symb = <uglify.IAstSymbolRef>propAccess.expression;
                                    let thedef = <ISymbolDef>symb.thedef;
                                    if (thedef.bbRequirePath) {
                                        let extf = cached.reexport[thedef.bbRequirePath.toLowerCase()];
                                        if (extf === undefined) {
                                            extf = Object.create(null);
                                            cached.reexport[thedef.bbRequirePath.toLowerCase()] = extf;
                                        }
                                        let extn = matchPropKey(propAccess);
                                        if (extn) {
                                            extf[pea.name] = extn;
                                            return null;
                                        }
                                    }
                                }
                            }
                            if (!(pea.value instanceof uglify.AST_SymbolRef)) {
                                let newName = '__export_' + pea.name;
                                let newVar = new uglify.AST_Var({
                                    start: stmbody.start,
                                    end: stmbody.end,
                                    definitions: [
                                        new uglify.AST_VarDef({ name: new uglify.AST_SymbolVar({ name: newName, start: stmbody.start, end: stmbody.end }), value: pea.value })
                                    ]
                                });
                                let symb = new uglify.SymbolDef(ast, ast.variables.size(), newVar.definitions[0].name);
                                symb.undeclared = false;
                                ast.variables.set(newName, symb);
                                newVar.definitions[0].name.thedef = symb;
                                (<uglify.IAstSimpleStatement>stm).body = newVar;
                                cached.selfexports[pea.name] = new uglify.AST_SymbolRef({ name: newName, thedef: symb });
                                return newVar;
                            }
                            cached.selfexports[pea.name] = pea.value;
                            return null;
                        }
                        if (stmbody instanceof uglify.AST_Call) {
                            let call = <uglify.IAstCall>stmbody;
                            if (patternDefinePropertyExportsEsModule(call))
                                return null;
                            if (call.args.length === 1 && call.expression instanceof uglify.AST_SymbolRef) {
                                let symb = <uglify.IAstSymbolRef>call.expression;
                                if (symb.thedef === reexportDef) {
                                    let req = constParamOfCallRequire(call.args[0]);
                                    if (req != null) {
                                        let reqr = resolveRequire(req, name);
                                        if (reqr == null) {
                                            throw new Error('require("' + req + '") not found from ' + name);
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
                    } else if (stm instanceof uglify.AST_Defun) {
                        let fnc = <uglify.IAstFunction>stm;
                        if (fnc.name.name === '__export') {
                            reexportDef = fnc.name.thedef;
                            return null;
                        }
                    }
                    return stm;
                }).filter((stm) => {
                    return stm != null;
                });
                return true;
            }
            let req = constParamOfCallRequire(node);
            if (req != null) {
                let reqr = resolveRequire(req, name);
                if (reqr == null) {
                    throw new Error('require("' + req + '") not found from ' + name);
                }
                let parent = walker.parent();
                if (parent instanceof uglify.AST_VarDef) {
                    let vardef = <uglify.IAstVarDef>parent;
                    (<ISymbolDef>vardef.name.thedef).bbRequirePath = reqr;
                }
                if (cached.requires.indexOf(reqr) < 0)
                    cached.requires.push(reqr);
            }
            return false;
        });
        ast.walk(walker);
        project.cache[name.toLowerCase()] = cached;
    }
    cached.requires.forEach((r) => {
        if (stack.indexOf(r) >= 0)
            return;
        stack.push(r);
        check(r, order, stack, project, resolveRequire);
    });
    cached.exports = Object.assign(Object.create(null), cached.selfexports);
    cached.reexportAll.forEach(exp=> {
        exp = exp.toLowerCase();
        Object.assign(cached.exports, project.cache[exp].exports || project.cache[exp].selfexports);
    });
    let reex = Object.keys(cached.reexport);
    reex.forEach((exp) => {
        let expm = project.cache[exp].exports || project.cache[exp].selfexports;
        let exps = cached.reexport[exp];
        let expsn = Object.keys(exps);
        expsn.forEach((nn) => {
            cached.exports[nn] = expm[exps[nn]];
        });
    });
    order.push(cached);
}

function renameSymbol(node: uglify.IAstNode): uglify.IAstNode {
    if (node instanceof uglify.AST_Symbol) {
        let symb = <uglify.IAstSymbol>node;
        if (symb.thedef == null) return node;
        let rename = (<ISymbolDef>symb.thedef).bbRename;
        if (rename !== undefined) {
            symb = <uglify.IAstSymbol>symb.clone();
            symb.name = rename;
            symb.thedef = undefined;
            symb.scope = undefined;
            return symb;
        }
    }
    return node;
}
export function bundle(project: IBundleProject) {
    project.cache = project.cache || Object.create(null);
    let fileExists = (name: string) => project.checkFileModification(name) != null;
    let readFile = (name: string) => project.readContent(name);
    let lowResolveRequire = project.resolveRequire || defaultResolveRequire;
    let resolveRequire = (name: string, from: string): string => {
        return lowResolveRequire(name, from, fileExists, readFile);
    }
    let order = <IFileForBundle[]>[];
    let stack = [];
    project.getMainFiles().forEach((val) => check(val, order, stack, project, resolveRequire));
    let bundleAst = <uglify.IAstToplevel>uglify.parse('(function(){})()');
    let bodyAst = (<uglify.IAstFunction>(<uglify.IAstCall>(<uglify.IAstSimpleStatement>bundleAst.body[0]).body).expression).body;
    let topLevelNames = Object.create(null);
    let wasSomeDifficult = false;
    order.forEach((f) => {
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
        if (suffix.lastIndexOf('/') >= 0) suffix = suffix.substr(suffix.lastIndexOf('/') + 1);
        if (suffix.indexOf('.') >= 0) suffix = suffix.substr(0, suffix.indexOf('.'));
        f.ast.variables.each((symb, name) => {
            if ((<ISymbolDef>symb).bbRequirePath) return;
            let newname = name;
            if (topLevelNames[name] !== undefined) {
                let index = 0;
                do {
                    index++;
                    newname = name + "_" + suffix;
                    if (index > 1) newname += '' + index;
                } while (topLevelNames[newname] !== undefined);
                (<ISymbolDef>symb).bbRename = newname;
            } else {
                (<ISymbolDef>symb).bbRename = undefined;
            }
            topLevelNames[newname] = true;
        });
        let transformer = new uglify.TreeTransformer((node): uglify.IAstNode => {
            if (node instanceof uglify.AST_Label) {
                return node;
            }
            if (node instanceof uglify.AST_Symbol) {
                let symb = <uglify.IAstSymbol>node;
                if (symb.thedef == null) return undefined;
                let rename = (<ISymbolDef>symb.thedef).bbRename;
                if (rename !== undefined) {
                    symb = <uglify.IAstSymbol>symb.clone();
                    symb.name = rename;
                    symb.thedef = undefined;
                    symb.scope = undefined;
                    return symb;
                }
            }
            if (node instanceof uglify.AST_PropAccess) {
                let propAccess = (<uglify.IAstPropAccess>node);
                if (isExports(propAccess.expression)) {
                    let key = matchPropKey(propAccess);
                    if (key) {
                        let symb = f.selfexports[key];
                        if (symb)
                            return renameSymbol(symb);
                    }
                }
            }
            return undefined;
        }, (node) => {
            if (node instanceof uglify.AST_Block) {
                let block = <uglify.IAstBlock>node;
                block.body = block.body.filter((stm) => {
                    if (stm instanceof uglify.AST_Var) {
                        let varn = <uglify.IAstVar>stm;
                        if (varn.definitions.length === 0) return false;
                    }
                    return true;
                });
            }
            if (node instanceof uglify.AST_Toplevel) {
                let topLevel = <uglify.IAstToplevel>node;
                bodyAst.push(...topLevel.body);
            } else if (node instanceof uglify.AST_Var) {
                let varn = <uglify.IAstVar>node;
                varn.definitions = varn.definitions.filter((vd) => {
                    return vd.name != null;
                });
            } else if (node instanceof uglify.AST_VarDef) {
                let vardef = <uglify.IAstVarDef>node;
                let thedef = <ISymbolDef>vardef.name.thedef;
                if (thedef && thedef.bbRequirePath) {
                    let extf = project.cache[thedef.bbRequirePath.toLowerCase()];
                    if (extf.difficult) {
                        vardef.value = (<uglify.IAstSimpleStatement>uglify.parse(`__bbe['${thedef.bbRequirePath}']`).body[0]).body;
                    } else {
                        vardef.value = null;
                        vardef.name = null;
                    }
                }
            } else if (node instanceof uglify.AST_PropAccess) {
                let propAccess = <uglify.IAstPropAccess>node;
                if (propAccess.expression instanceof uglify.AST_SymbolRef) {
                    let symb = <uglify.IAstSymbolRef>propAccess.expression;
                    let thedef = <ISymbolDef>symb.thedef;
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
        let compressor = uglify.Compressor({ warnings: false, global_defs: project.defines });
        bundleAst = bundleAst.transform(compressor);
        // in future to make another pass with removing function calls with empty body
    }
    if (project.mangle !== false) {
        bundleAst.figure_out_scope();
        bundleAst.mangle_names();
    }
    let os = uglify.OutputStream({
        beautify: project.beautify === true
    });
    bundleAst.print(os);
    project.writeBundle(os.toString());
}
