export declare function createProject(param: {
    id: string;
    dir: string;
}): void;
export declare function refreshProject(param: {
    id: string;
    allFiles: {
        [dir: string]: string[];
    };
}): void;
export declare function disposeProject(param: string): void;
export declare function setProjectOptions(param: {
    id: string;
    options: any;
}): void;
export declare function loadTranslations(param: string): void;
export declare function compile(param: string): void;
export declare function executePlugins(param: any): void;
export declare function installDependencies(param: any): void;
