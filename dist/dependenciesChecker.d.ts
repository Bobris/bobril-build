import * as bb from './index';
export declare function installMissingDependencies(project: bb.IProject): boolean;
export declare function registerCommands(c: commander.IExportedCommand, consumeCommand: Function): void;
