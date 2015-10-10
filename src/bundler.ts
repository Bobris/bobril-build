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
}

export interface IBundleProject {
    // return in Date.now() units or null if does not exist 
    checkFileModification(name: string): number;
    readContent(name: string): string;
    getMainFiles(): string[];
    writeBundle(content: string);
    resolveRequire?(name: string, from: string, fileExists: (name: string) => boolean, readFile: (name:string) => string): string;

    cache?: { [name: string]: IFileForBundle };
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

function check(name: string, order: string[], stack: string[], project: IBundleProject, resolveRequire: (name: string, from: string) => string) {
    let cached: IFileForBundle = project.cache[name];
    if (cached === undefined) {
        let mod = project.checkFileModification(name);
        if (mod == null) return;
        let ast = uglify.parse(project.readContent(name));
        ast.figure_out_scope();
        cached = { name, astTime: mod, ast, requires: [] };
        uglify.TreeWalker((node: uglify.IAstNode) => {
            if (node instanceof uglify.AST_Call) {
                let call = <uglify.IAstCall>node;
                function isRequire(symbolDef: uglify.ISymbolDef) {
                    return symbolDef.undeclared && symbolDef.global && symbolDef.name === 'require';
                }
                if (call.args.length === 1 && call.expression instanceof uglify.AST_SymbolRef && (isRequire((<uglify.IAstSymbolRef>call.expression).thedef))) {
                    let arg = call.args[0];
                    if (arg instanceof uglify.AST_String) {
                    }
                }
            } 
            return false;
        })
        project.cache[name] = cached;
    }
}

export function bundle(project: IBundleProject) {
    project.cache = project.cache || Object.create(null);
    let fileExists = (name: string) => project.checkFileModification(name) != null;
    let readFile = (name: string) => project.readContent(name);
    let lowResolveRequire = project.resolveRequire || defaultResolveRequire;
    let resolveRequire = (name: string, from: string): string => {
        return lowResolveRequire(name, from, fileExists, readFile);
    }
    let order = [];
    let stack = [];
    project.getMainFiles().forEach((val) => check(val, order, stack, project, resolveRequire));

}
