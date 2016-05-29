export declare function dirOfNodeModule(name: string): string;
export declare function currentDirectory(): string;
export declare function isAbsolutePath(name: string): boolean;
export declare function join(...paths: string[]): string;
export declare function mkpathsync(dirpath: string): void;
export declare function fileModifiedTime(path: string): number;
export declare function recursiveRemoveDirSync(path: string): Boolean;
export declare function normalizePath(path: string): string;
