import * as uglify from 'uglify-js';
export interface IFileForBundle {
    name: string;
    astTime: number;
    ast: uglify.IAstToplevel;
    requires: string[];
    difficult: boolean;
    selfexports: {
        name?: string;
        node?: uglify.IAstNode;
        reexport?: string;
    }[];
    exports: {
        [name: string]: uglify.IAstNode;
    };
    pureFuncs: {
        [name: string]: boolean;
    };
}
export interface IBundleProject {
    checkFileModification(name: string): number;
    readContent(name: string): string;
    getMainFiles(): string[];
    writeBundle(content: string): any;
    resolveRequire?(name: string, from: string, fileExists: (name: string) => boolean, readFile: (name: string) => string): string;
    compress?: boolean;
    mangle?: boolean;
    beautify?: boolean;
    defines?: {
        [name: string]: any;
    };
    cache?: {
        [name: string]: IFileForBundle;
    };
}
export declare function bundle(project: IBundleProject): void;
