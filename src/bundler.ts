import * as fs from "fs";
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as pathUtils from './pathUtils';
import * as uglify from 'uglifyjs';

export interface IFileForBundle {
    name: string;
    astTime: number;
    ast: uglify.IAstToplevel;
    requires: string[];
    exports: { [name: string]: uglify.IAstNode };
}

export interface IBundleProject {
    // return in Date.now() units or null if does not exist 
    checkFileModification(name: string): number;
    readContent(name: string): string;
    getMainFiles(): string[];
    writeBundle(content: string);
    resolveRequire?(name: string, from: string, fileExists: (name: string) => boolean, readFile: (name: string) => string): string;

    cache?: { [name: string]: IFileForBundle };
}

interface ISymbolDef extends uglify.ISymbolDef {
    bbRequirePath?: string;
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

function constParamOfCallRequire(node: uglify.IAstNode):string {
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
        if (assign.operator = "=") {
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

function check(name: string, order: IFileForBundle[], stack: string[], project: IBundleProject, resolveRequire: (name: string, from: string) => string) {
    let cached: IFileForBundle = project.cache[name];
    let mod = project.checkFileModification(name);
    if (cached === undefined || cached.astTime !== mod) {
        if (mod == null) {
            throw new Error('Cannot open ' + name);
        }
        let ast = uglify.parse(project.readContent(name));
        ast.figure_out_scope();
        cached = { name, astTime: mod, ast, requires: [], exports: Object.create(null) };
        let exportsSymbol = ast.globals['exports'];
        let walker = new uglify.TreeWalker((node: uglify.IAstNode) => {
            if (node instanceof uglify.AST_Block) {
                (<uglify.IAstBlock>node).body = (<uglify.IAstBlock>node).body.filter((stm) => {
                    if (stm instanceof uglify.AST_SimpleStatement) {
                        let stmbody = (<uglify.IAstSimpleStatement>stm).body;
                        let pea = paternAssignExports(stmbody);
                        if (pea) {
                            cached.exports[pea.name] = pea.value;
                            return false;
                        }
                    }
                    return true;
                });
            }
            let req = constParamOfCallRequire(node);
            if (req != null) {
                console.log(walker.parent(0).TYPE, walker.parent(1).TYPE, walker.parent(2).TYPE);
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
        project.cache[name] = cached;
    }
    cached.requires.forEach((r) => {
        if (stack.indexOf(r) >= 0)
            return;
        stack.push(r);
        check(r, order, stack, project, resolveRequire);
    });
    order.push(cached);
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
    let bundleAst = new uglify.AST_Toplevel({ body: [] });
    order.forEach((f) => {
        let transformer = new uglify.TreeTransformer(null, (node) => {
            if (node instanceof uglify.AST_Toplevel) {
                bundleAst.body.push((<uglify.IAstToplevel>node).body);
            } else if (node instanceof uglify.AST_VarDef) {
                let vardef = <uglify.IAstVarDef>node;
                let thedef = <ISymbolDef>vardef.name.thedef;
                if (thedef.bbRequirePath) {
                    vardef.value = null;
                }
            } else if (node instanceof uglify.AST_PropAccess) {
                let propAccess = <uglify.IAstPropAccess>node;

            }
            return undefined;
        });
        f.ast.transform(transformer);
    });
    let os = uglify.OutputStream({
        beautify: true
    });
    bundleAst.print(os);
    project.writeBundle(os.toString());
}
