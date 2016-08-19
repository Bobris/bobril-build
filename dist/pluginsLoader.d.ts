export declare enum EntryMethodType {
    registerCommands = 0,
    afterStartCompileProcess = 1,
    afterInteractiveCompile = 2,
    initPluginLoader = 3,
    registerActions = 4,
    invokeAction = 5,
    updateWatchPaths = 6,
}
export interface IPluginLoader {
    executeEntryMethod(methodType: EntryMethodType, ...args: any[]): any;
    registerCommands(c: any, commandRunningCallback: any): any;
}
export declare let pluginsLoader: IPluginLoader;
export declare function init(workingDirectory: string): void;
