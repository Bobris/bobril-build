export declare enum EntryMethodType {
    registerCommands = 0,
    afterStartCompileProcess = 1,
    initPluginLoader = 2,
}
export interface IPluginLoader {
    executeEntryMethod(methodType: EntryMethodType, ...args: any[]): any;
    registerCommands(c: any, commandRunningCallback: any): any;
}
export declare let pluginsLoader: IPluginLoader;
export declare function init(workingDirectory: string): void;
