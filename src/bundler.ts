import * as fs from "fs";
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everywhere, just use forward slashes
import * as pathUtils from "./pathUtils";
import * as uglify from "uglify-js";
import { globalDefines } from "./simpleHelpers";
import * as bobrilDepsHelpers from "./bobrilDepsHelpers";

export interface IFileForBundle {
    name: string;
    ast: uglify.IAstToplevel;
    requires: string[];
    // it is not really TypeScript converted to commonjs
    difficult: boolean;
    selfexports: { name?: string; node?: uglify.IAstNode; reexport?: string }[];
    exports: { [name: string]: uglify.IAstNode };
    pureFuncs: { [name: string]: boolean };
}

export interface IBundleProject {
    fileExists(name: string): boolean;
    readContent(name: string): string;
    getMainFiles(): string[];
    projectRoot?: string;
    writeBundle(content: string);
    resolveRequire?(
        name: string,
        from: string,
        fileExists: (name: string) => boolean,
        readFile: (name: string) => string
    ): string;
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
    bbAlwaysClone?: boolean;
}

function buildCachedResolveRequire(projectRoot?: string) {
    var cache: { [name: string]: string } = Object.create(null);
    return (
        name: string,
        from: string,
        fileExists: (name: string) => boolean,
        readFile: (name: string) => string
    ) => {
        if (name[0] === ".") {
            return defaultResolveRequire(
                name,
                from,
                fileExists,
                readFile,
                projectRoot
            );
        }
        if (cache[name] != null) {
            return cache[name];
        }
        var res = defaultResolveRequire(
            name,
            from,
            fileExists,
            readFile,
            projectRoot
        );
        if (res != null) {
            cache[name] = res;
        }
        return res;
    };
}

function defaultResolveRequire(
    name: string,
    from: string,
    fileExists: (name: string) => boolean,
    readFile: (name: string) => string,
    projectRoot?: string
): string {
    if (name[0] === ".") {
        let res = path.join(path.dirname(from), name);
        if (fileExists(res + ".js")) return res + ".js";
        if (fileExists(res)) return res;
        return null;
    }
    let oldDir = null;
    let curDir = projectRoot || path.dirname(from);
    while (oldDir != curDir) {
        let tryName = path.join(curDir, "node_modules", name, "package.json");
        if (fileExists(tryName)) {
            let packageJson = readFile(tryName);
            let content: any;
            try {
                content = JSON.parse(packageJson);
                let mainjs = "main";
                // Nasty workaround
                if (content.name === "typescript-collections") {
                    mainjs = "jsnext:main";
                }
                tryName = path.join(
                    curDir,
                    "node_modules",
                    name,
                    content[mainjs] || "index.js"
                );
            } catch (err) {
                return null;
            }
            if (fileExists(tryName)) return tryName;
            tryName = path.join(curDir, "node_modules", name, "index.js");
            if (fileExists(tryName)) return tryName;
            console.log(
                "Ignoring invalid module " +
                    path.join(curDir, "node_modules", name)
            );
            // Invalid module, continue search up in tree
        }
        oldDir = curDir;
        curDir = path.dirname(curDir);
    }
    if (fileExists(name + ".js")) return name + ".js";
    return null;
}

function isRequire(symbolDef: uglify.ISymbolDef) {
    return (
        symbolDef != null &&
        symbolDef.undeclared &&
        symbolDef.global &&
        symbolDef.name === "require"
    );
}

function constParamOfCallRequire(node: uglify.IAstNode): string {
    if (node instanceof uglify.AST_Call) {
        let call = <uglify.IAstCall>node;
        if (
            call.args.length === 1 &&
            call.expression instanceof uglify.AST_SymbolRef &&
            isRequire((<uglify.IAstSymbolRef>call.expression).thedef)
        ) {
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
        // thedef could be null because it could be already renamed/cloned ref
        if (
            thedef &&
            thedef.global &&
            thedef.undeclared &&
            thedef.name === "exports"
        )
            return true;
    }
    return false;
}

function matchPropKey(propAccess: uglify.IAstPropAccess): string {
    let name = propAccess.property;
    if (name instanceof uglify.AST_String) {
        name = (<uglify.IAstString>name).value;
    }
    if (typeof name === "string") {
        return name;
    }
    return undefined;
}

function paternAssignExports(
    node: uglify.IAstNode
): { name: string; value: uglify.IAstNode } {
    if (node instanceof uglify.AST_Assign) {
        let assign = <uglify.IAstAssign>node;
        if (assign.operator === "=") {
            if (assign.left instanceof uglify.AST_PropAccess) {
                let propAccess = <uglify.IAstPropAccess>assign.left;
                if (isExports(propAccess.expression)) {
                    let name = matchPropKey(propAccess);
                    if (name !== undefined) {
                        return {
                            name,
                            value: assign.right
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
            if (matchPropKey(exp) === "defineProperty") {
                if (exp.expression instanceof uglify.AST_SymbolRef) {
                    let symb = <uglify.IAstSymbolRef>exp.expression;
                    if (symb.name === "Object") return true;
                }
            }
        }
    }
    return false;
}

function isConstantSymbolRef(node: uglify.IAstNode) {
    if (node instanceof uglify.AST_SymbolRef) {
        let def = (<uglify.IAstSymbolRef>node).thedef;
        if (def.undeclared) return false;
        if (def.orig.length !== 1) return false;
        if (def.orig[0] instanceof uglify.AST_SymbolDefun) return true;
    }
    return false;
}

function check(
    name: string,
    order: IFileForBundle[],
    visited: string[],
    project: IBundleProject,
    resolveRequire: (name: string, from: string) => string
) {
    let cached: IFileForBundle = project.cache[name.toLowerCase()];
    let reexportDef: uglify.ISymbolDef = null;
    if (cached === undefined) {
        let fileContent = project.readContent(name);
        //console.log("============== START " + name);
        //console.log(fileContent);
        let ast = uglify.parse(fileContent);
        //console.log(ast.print_to_string({ beautify: true }));
        ast.figure_out_scope();
        cached = {
            name,
            ast,
            requires: [],
            difficult: false,
            selfexports: [],
            exports: null,
            pureFuncs: Object.create(null)
        };
        let pureMatch = fileContent.match(/^\/\/ PureFuncs:.+/gm);
        if (pureMatch) {
            pureMatch.forEach(m => {
                m
                    .toString()
                    .substr(m.indexOf(":") + 1)
                    .split(",")
                    .forEach(s => {
                        if (s.length === 0) return;
                        cached.pureFuncs[s.trim()] = true;
                    });
            });
        }
        if (ast.globals.has("module")) {
            cached.difficult = true;
            ast = uglify.parse(`(function(){ var exports = {}; var module = { exports: exports }; var global = this; ${project.readContent(
                name
            )}
__bbe['${name}']=module.exports; }).call(window);`);
            cached.ast = ast;
            project.cache[name.toLowerCase()] = cached;
            order.push(cached);
            return;
        }
        let exportsSymbol = ast.globals["exports"];
        let unshiftToBody = [];
        let selfExpNames = Object.create(null);
        let varDecls: uglify.IAstVarDef[] = null;
        let walker = new uglify.TreeWalker(
            (node: uglify.IAstNode, descend: () => void) => {
                if (node instanceof uglify.AST_Block) {
                    (<uglify.IAstBlock>node).body = (<uglify.IAstBlock>node).body
                        .map((stm): uglify.IAstNode => {
                            if (stm instanceof uglify.AST_Directive) {
                                // skip "use strict";
                                return null;
                            } else if (
                                stm instanceof uglify.AST_SimpleStatement
                            ) {
                                let stmbody = (<uglify.IAstSimpleStatement>stm)
                                    .body;
                                let pea = paternAssignExports(stmbody);
                                if (pea) {
                                    let newName = "__export_" + pea.name;
                                    if (
                                        selfExpNames[pea.name] &&
                                        stmbody instanceof uglify.AST_Assign
                                    ) {
                                        (<uglify.IAstAssign>stmbody).left = new uglify.AST_SymbolRef(
                                            {
                                                name: newName,
                                                thedef: ast.variables.get(
                                                    newName
                                                )
                                            }
                                        );
                                        return stm;
                                    }
                                    if (isConstantSymbolRef(pea.value)) {
                                        selfExpNames[pea.name] = true;
                                        let def = <ISymbolDef>(<uglify.IAstSymbolRef>pea.value)
                                            .thedef;
                                        def.bbAlwaysClone = true;
                                        cached.selfexports.push({
                                            name: pea.name,
                                            node: pea.value
                                        });
                                        return null;
                                    }
                                    let newVar = new uglify.AST_Var({
                                        start: stmbody.start,
                                        end: stmbody.end,
                                        definitions: [
                                            new uglify.AST_VarDef({
                                                name: new uglify.AST_SymbolVar({
                                                    name: newName,
                                                    start: stmbody.start,
                                                    end: stmbody.end
                                                }),
                                                value: pea.value
                                            })
                                        ]
                                    });
                                    let symb = ast.def_variable(
                                        newVar.definitions[0].name
                                    );
                                    symb.undeclared = false;
                                    (<ISymbolDef>symb).bbAlwaysClone = true;
                                    selfExpNames[pea.name] = true;
                                    cached.selfexports.push({
                                        name: pea.name,
                                        node: new uglify.AST_SymbolRef({
                                            name: newName,
                                            thedef: symb
                                        })
                                    });
                                    return newVar;
                                }
                                if (stmbody instanceof uglify.AST_Call) {
                                    let call = <uglify.IAstCall>stmbody;
                                    if (
                                        patternDefinePropertyExportsEsModule(
                                            call
                                        )
                                    )
                                        return null;
                                    if (
                                        call.args.length === 1 &&
                                        call.expression instanceof
                                            uglify.AST_SymbolRef
                                    ) {
                                        let symb = <uglify.IAstSymbolRef>call.expression;
                                        if (symb.thedef === reexportDef) {
                                            let req = constParamOfCallRequire(
                                                call.args[0]
                                            );
                                            if (req != null) {
                                                let reqr = resolveRequire(
                                                    req,
                                                    name
                                                );
                                                if (reqr == null) {
                                                    throw new Error(
                                                        'require("' +
                                                            req +
                                                            '") not found from ' +
                                                            name
                                                    );
                                                }
                                                if (
                                                    cached.requires.indexOf(
                                                        reqr
                                                    ) < 0
                                                )
                                                    cached.requires.push(reqr);
                                                cached.selfexports.push({
                                                    reexport: reqr
                                                });
                                                return null;
                                            }
                                        }
                                    }
                                }
                            } else if (stm instanceof uglify.AST_Defun) {
                                let fnc = <uglify.IAstFunction>stm;
                                if (fnc.name.name === "__export") {
                                    reexportDef = fnc.name.thedef;
                                    return null;
                                }
                            }
                            return stm;
                        })
                        .filter(stm => {
                            return stm != null;
                        });
                    descend();
                    return true;
                }
                if (node instanceof uglify.AST_PropAccess) {
                    if (
                        !(walker.parent() instanceof uglify.AST_Assign) ||
                        !(
                            walker.parent(1) instanceof
                            uglify.AST_SimpleStatement
                        )
                    ) {
                        let propAccess = <uglify.IAstPropAccess>node;
                        if (isExports(propAccess.expression)) {
                            let key = matchPropKey(propAccess);
                            if (key) {
                                if (selfExpNames[key]) return false;
                                let newName = "__export_" + key;
                                if (varDecls == null) {
                                    let vartop = uglify.parse("var a;");
                                    let stm = <uglify.IAstVar>vartop.body[0];
                                    unshiftToBody.push(stm);
                                    varDecls = stm.definitions;
                                    varDecls.pop();
                                }
                                let symbVar = new uglify.AST_SymbolVar({
                                    name: newName,
                                    start: node.start,
                                    end: node.end
                                });
                                varDecls.push(
                                    new uglify.AST_VarDef({
                                        name: symbVar,
                                        value: null
                                    })
                                );
                                let symb = ast.def_variable(symbVar);
                                symb.undeclared = false;
                                (<ISymbolDef>symb).bbAlwaysClone = true;
                                selfExpNames[key] = true;
                                cached.selfexports.push({
                                    name: key,
                                    node: new uglify.AST_SymbolRef({
                                        name: newName,
                                        thedef: symb
                                    })
                                });
                                return false;
                            }
                        }
                    }
                }
                let req = constParamOfCallRequire(node);
                if (req != null) {
                    let reqr = resolveRequire(req, name);
                    if (reqr == null) {
                        throw new Error(
                            'require("' + req + '") not found from ' + name
                        );
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
            }
        );
        ast.walk(walker);
        ast.body.unshift(...unshiftToBody);
        //console.log(ast.print_to_string({ beautify: true }));
        project.cache[name.toLowerCase()] = cached;
    }
    cached.requires.forEach(r => {
        const lowerR = r.toLowerCase();
        if (visited.indexOf(lowerR) >= 0) return;
        visited.push(lowerR);
        check(r, order, visited, project, resolveRequire);
    });
    cached.exports = Object.create(null);
    cached.selfexports.forEach(exp => {
        if (exp.name) {
            cached.exports[exp.name] = exp.node;
        } else if (exp.reexport) {
            let reexModule = project.cache[exp.reexport.toLowerCase()];
            if (reexModule.exports) {
                Object.assign(cached.exports, reexModule.exports);
            } else {
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

function renameSymbol(node: uglify.IAstNode): uglify.IAstNode {
    if (node instanceof uglify.AST_Symbol) {
        let symb = <uglify.IAstSymbol>node;
        if (symb.thedef == null) return node;
        let rename = (<ISymbolDef>symb.thedef).bbRename;
        if (rename !== undefined || (<ISymbolDef>symb.thedef).bbAlwaysClone) {
            symb = <uglify.IAstSymbol>symb.clone();
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

export function bundle(project: IBundleProject) {
    project.cache = project.cache || Object.create(null);
    let fileExists = (name: string) => project.fileExists(name);
    let readFile = (name: string) => project.readContent(name);
    let lowResolveRequire =
        project.resolveRequire ||
        buildCachedResolveRequire(project.projectRoot);
    let resolveRequire = (name: string, from: string): string => {
        return lowResolveRequire(name, from, fileExists, readFile);
    };
    let order = <IFileForBundle[]>[];
    let visited = [];
    let pureFuncs: { [name: string]: boolean } = Object.create(null);
    project.getMainFiles().forEach(val => {
        const lowerVal = val.toLowerCase();
        if (visited.indexOf(lowerVal) >= 0) return;
        visited.push(lowerVal);
        check(val, order, visited, project, resolveRequire);
    });
    let bundleAst = <uglify.IAstToplevel>uglify.parse(
        '(function(){"use strict";\n' + bobrilDepsHelpers.tslibSource() + "})()"
    );
    let bodyAst = (<uglify.IAstFunction>(<uglify.IAstCall>(<uglify.IAstSimpleStatement>bundleAst
        .body[0]).body).expression).body;
    let topLevelNames = Object.create(null);
    // top level vars from tslibSource
    topLevelNames["__extendStatics"] = true;
    topLevelNames["__extends"] = true;
    topLevelNames["__assign"] = true;
    topLevelNames["__rest"] = true;
    topLevelNames["__decorate"] = true;
    topLevelNames["__param"] = true;
    topLevelNames["__metadata"] = true;
    topLevelNames["__awaiter"] = true;
    topLevelNames["__generator"] = true;
    let wasSomeDifficult = false;
    order.forEach(f => {
        if (f.difficult) {
            if (!wasSomeDifficult) {
                let ast = uglify.parse("var __bbe={};");
                bodyAst.push(...ast.body);
                wasSomeDifficult = true;
            }
            bodyAst.push(...f.ast.body);
            return;
        }
        let suffix = f.name;
        if (suffix.lastIndexOf("/") >= 0)
            suffix = suffix.substr(suffix.lastIndexOf("/") + 1);
        if (suffix.indexOf(".") >= 0)
            suffix = suffix.substr(0, suffix.indexOf("."));
        suffix = suffix.replace(/-/g, "_");
        let walker = new uglify.TreeWalker(
            (node: uglify.IAstNode, descend: () => void) => {
                if (node instanceof uglify.AST_Scope) {
                    node.variables.each((symb, name) => {
                        if ((<ISymbolDef>symb).bbRequirePath) return;
                        let newname = (<ISymbolDef>symb).bbRename || name;
                        if (
                            topLevelNames[name] !== undefined &&
                            name !== "__extends" &&
                            (node === f.ast ||
                                node.enclosed.some(
                                    enclSymb =>
                                        topLevelNames[enclSymb.name] !==
                                        undefined
                                ))
                        ) {
                            let index = 0;
                            do {
                                index++;
                                newname = name + "_" + suffix;
                                if (index > 1) newname += "" + index;
                            } while (topLevelNames[newname] !== undefined);
                            (<ISymbolDef>symb).bbRename = newname;
                        } else {
                            (<ISymbolDef>symb).bbRename = undefined;
                        }
                        if (node === f.ast) {
                            if (name in f.pureFuncs) pureFuncs[newname] = true;
                            topLevelNames[newname] = true;
                        }
                    });
                }
                return false;
            }
        );
        f.ast.walk(walker);
    });
    order.forEach(f => {
        if (f.difficult) return;
        let transformer = new uglify.TreeTransformer(
            (node): uglify.IAstNode => {
                if (node instanceof uglify.AST_Label) {
                    return node;
                }
                if (node instanceof uglify.AST_Symbol) {
                    let symb = <uglify.IAstSymbol>node;
                    if (symb.thedef == null) return undefined;
                    let rename = (<ISymbolDef>symb.thedef).bbRename;
                    if (
                        rename !== undefined ||
                        (<ISymbolDef>symb.thedef).bbAlwaysClone
                    ) {
                        symb = <uglify.IAstSymbol>symb.clone();
                        if (rename !== undefined) symb.name = rename;
                        symb.thedef = undefined;
                        symb.scope = undefined;
                        return symb;
                    }
                    let reqPath = (<ISymbolDef>symb.thedef).bbRequirePath;
                    if (
                        reqPath !== undefined &&
                        !(transformer.parent() instanceof uglify.AST_PropAccess)
                    ) {
                        let p = transformer.parent();
                        if (
                            p instanceof uglify.AST_VarDef &&
                            (<uglify.IAstVarDef>p).name === symb
                        )
                            return undefined;
                        let properties = [];
                        let extf = project.cache[reqPath.toLowerCase()];
                        if (!extf.difficult) {
                            let keys = Object.keys(extf.exports);
                            keys.forEach(key => {
                                properties.push(
                                    new uglify.AST_ObjectKeyVal({
                                        quote: "'",
                                        key,
                                        value: renameSymbol(extf.exports[key])
                                    })
                                );
                            });
                            return new uglify.AST_Object({ properties });
                        }
                    }
                }
                if (node instanceof uglify.AST_PropAccess) {
                    let propAccess = <uglify.IAstPropAccess>node;
                    if (isExports(propAccess.expression)) {
                        let key = matchPropKey(propAccess);
                        if (key) {
                            let symb = f.exports[key];
                            if (symb) return renameSymbol(symb);
                        }
                    }
                }
                return undefined;
            },
            node => {
                if (node instanceof uglify.AST_Block) {
                    let block = <uglify.IAstBlock>node;
                    block.body = block.body.filter(stm => {
                        if (stm instanceof uglify.AST_Var) {
                            let varn = <uglify.IAstVar>stm;
                            if (varn.definitions.length === 0) return false;
                        } else if (stm instanceof uglify.AST_SimpleStatement) {
                            let stmbody = (<uglify.IAstSimpleStatement>stm)
                                .body;
                            if (constParamOfCallRequire(stmbody) != null)
                                return false;
                        }
                        return true;
                    });
                }
                if (node instanceof uglify.AST_Toplevel) {
                    let topLevel = <uglify.IAstToplevel>node;
                    bodyAst.push(...topLevel.body);
                } else if (node instanceof uglify.AST_Var) {
                    let varn = <uglify.IAstVar>node;
                    varn.definitions = varn.definitions.filter(vd => {
                        return vd.name != null;
                    });
                } else if (node instanceof uglify.AST_VarDef) {
                    let vardef = <uglify.IAstVarDef>node;
                    let thedef = <ISymbolDef>vardef.name.thedef;
                    if (thedef && thedef.bbRequirePath) {
                        let extf =
                            project.cache[thedef.bbRequirePath.toLowerCase()];
                        if (extf.difficult) {
                            vardef.value = (<uglify.IAstSimpleStatement>uglify.parse(
                                `__bbe['${thedef.bbRequirePath}']`
                            ).body[0]).body;
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
                            let extf =
                                project.cache[
                                    thedef.bbRequirePath.toLowerCase()
                                ];
                            if (!extf.difficult) {
                                let extn = matchPropKey(propAccess);
                                if (extn) {
                                    let asts = extf.exports[extn];
                                    if (asts) {
                                        return renameSymbol(asts);
                                    }
                                    throw new Error(
                                        "In " +
                                            thedef.bbRequirePath +
                                            " cannot find " +
                                            extn
                                    );
                                }
                            }
                        }
                    }
                }
                return undefined;
            }
        );
        f.ast.transform(transformer);
    });
    if (project.compress !== false) {
        bundleAst.figure_out_scope();
        let compressor = uglify.Compressor({
            hoist_funs: false,
            warnings: false,
            global_defs: project.defines,
            pure_funcs: call => {
                if (call.expression instanceof uglify.AST_SymbolRef) {
                    let symb = <uglify.IAstSymbolRef>call.expression;
                    if (
                        symb.thedef.scope.parent_scope != null &&
                        symb.thedef.scope.parent_scope.parent_scope == null
                    ) {
                        if (symb.name in pureFuncs) return false;
                    }
                    return true;
                }
                return true;
            }
        });
        bundleAst = <uglify.IAstToplevel>bundleAst.transform(compressor);
        // in future to make another pass with removing function calls with empty body
    }
    if (project.mangle !== false) {
        bundleAst.figure_out_scope();
        let rootScope = null;
        let walker = new uglify.TreeWalker(n => {
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
        out = globalDefines(project.defines) + out;
    }
    project.writeBundle(out);
}
