import * as bb from './index';
export interface ICacheFile {
    modifiedTime?: number;
    content: Buffer;
}
export declare class AdditionalResources {
    cacheFiles: {
        [name: string]: ICacheFile;
    };
    project: bb.IProject;
    constructor(project: bb.IProject);
    tryGetFileContent(fileName: string): Buffer;
    copyFilesToOutputDir(): boolean;
    private recursiveCopyFiles(directory, subDirPath);
    private getCachedFileExistence(filePath);
    getCanUse(): (fn: string) => boolean;
    private getFileTimeStamp(filePath);
    private copyToProjectIfChanged(srcFilePath, destFilePath);
}
