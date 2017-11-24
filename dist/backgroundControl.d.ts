/// <reference types="node" />
import * as plugins from "./pluginsLoader";
import * as bb from './index';
export declare const bbDirRoot: string;
export declare let testServer: bb.TestServer;
export declare let mainServer: bb.MainServer;
export declare var memoryFs: {
    [name: string]: Buffer;
};
export declare function writeToMemoryFs(fn: string, b: Buffer): void;
export declare function startBackgroundProcess(name: string, callbacks: {}): (command: string, param?: any, callbacks?: {}) => void;
export declare function startWatchProcess(notify: (allFiles: {
    [dir: string]: string[];
}) => Promise<any>): void;
export interface ICompileProcess {
    refresh(allFiles: {
        [dir: string]: string[];
    }): Promise<any>;
    setOptions(options: any): Promise<bb.IProject>;
    callPlugins(method: plugins.EntryMethodType): Promise<any>;
    loadTranslations(): Promise<any>;
    installDependencies(): Promise<any>;
    compile(writer?: (name: string, content: Buffer) => void): Promise<{
        errors: number;
        warnings: number;
        hasTests: boolean;
    }>;
    stop(): void;
}
export declare function startCompileProcess(compilationPath: string): ICompileProcess;
