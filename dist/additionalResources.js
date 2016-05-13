"use strict";
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
const pathUtils = require('./pathUtils');
const fs = require('fs');
class AdditionalResources {
    constructor(project) {
        this.project = null;
        this.project = project;
        this.cacheFiles = {};
    }
    tryGetFileContent(fileName) {
        if (this.project.additionalResourcesDirectory == null)
            return null;
        let filePath = path.join(this.project.dir, this.project.additionalResourcesDirectory, fileName);
        let cached = this.getCachedFileExistence(filePath);
        if (cached == null)
            return null;
        try {
            let timeStamp = this.getFileTimeStamp(filePath);
            if (cached.modifiedTime == timeStamp)
                return cached.content;
            this.project.logCallback("load");
            cached.content = fs.readFileSync(filePath);
            cached.modifiedTime = timeStamp;
            return cached.content;
        }
        catch (ex) {
            this.project.logCallback("File content can not be loaded. (" + ex + ")");
            cached.modifiedTime = undefined;
        }
        return null;
    }
    copyFilesToOuputDir() {
        if (this.project.additionalResourcesDirectory == null)
            return null;
        this.project.logCallback("Coping additional resources...");
        try {
            let directoryPath = path.join(this.project.dir, this.project.additionalResourcesDirectory);
            this.recursiveCopyFiles(directoryPath, "");
        }
        catch (ex) {
            this.project.logCallback("Additional file can not be copied. (" + ex + ")");
        }
    }
    recursiveCopyFiles(directory, subDirPath) {
        let files = fs.readdirSync(directory);
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let filePath = path.join(directory, file);
            if (fs.lstatSync(filePath).isDirectory()) {
                this.recursiveCopyFiles(filePath, path.join(subDirPath, file));
            }
            else {
                let outputdir = this.project.outputDir;
                let destPath = path.resolve(outputdir, subDirPath, file);
                this.copyToProjectIfChanged(filePath, destPath);
            }
        }
    }
    getCachedFileExistence(filePath) {
        let resolvedNameLowerCased = filePath.toLowerCase();
        let cached = this.cacheFiles[resolvedNameLowerCased];
        let fileExist = fs.existsSync(filePath);
        if (!fileExist) {
            if (cached) {
                delete this.cacheFiles[resolvedNameLowerCased];
            }
            return null;
        }
        if (cached === undefined) {
            cached = { content: null };
            this.cacheFiles[resolvedNameLowerCased] = cached;
        }
        return cached;
    }
    getFileTimeStamp(filePath) {
        try {
            return fs.statSync(filePath).mtime.getTime();
        }
        catch (er) {
            this.project.logCallback('Time stamp can not be created. (' + er + ')');
            return -1;
        }
    }
    copyToProjectIfChanged(srcFilePath, destFilePath) {
        let cache = this.getCachedFileExistence(srcFilePath);
        if (cache == null) {
            this.project.logCallback('Cannot copy file' + srcFilePath + ' to ' + destFilePath + ' because it does not exist');
            return;
        }
        let timeStamp = this.getFileTimeStamp(srcFilePath);
        if (cache.modifiedTime == timeStamp)
            return;
        try {
            let buf = fs.readFileSync(srcFilePath);
            pathUtils.mkpathsync(path.dirname(destFilePath));
            var fd = fs.openSync(destFilePath, 'w');
            fs.writeSync(fd, buf, 0, buf.length);
            fs.close(fd);
        }
        catch (ex) {
            this.project.logCallback("File can not be copied. (" + ex + ")");
            cache.modifiedTime = null;
            return;
        }
        cache.modifiedTime = timeStamp;
    }
}
exports.AdditionalResources = AdditionalResources;
//# sourceMappingURL=additionalResources.js.map