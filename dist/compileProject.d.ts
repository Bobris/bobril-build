import * as bb from './index';
export declare function createProjectFromDir(path: string): bb.IProject;
export declare function refreshProjectFromPackageJson(project: bb.IProject, allFiles: {
    [dir: string]: string[];
}): boolean;
export declare function defineTranslationReporter(project: bb.IProject): void;
export declare function emitTranslationsJs(project: bb.IProject, translationDb: bb.TranslationDb): void;
export declare function fillMainSpec(project: bb.IProject): Promise<any>;
export declare function compileProject(project: bb.IProject): Promise<bb.CompilationResult>;
