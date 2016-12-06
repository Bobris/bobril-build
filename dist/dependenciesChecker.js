"use strict";
const fs = require('fs');
const path = require("path");
const bb = require('./index');
const pathUtils = require("./pathUtils");
const processUtils = require("./processUtils");
class DependenciesChecker {
    constructor(project) {
        this.missingModules = [];
        this.project = project;
    }
    getModulePath() {
        return path.join(this.project.dir, "node_modules");
    }
    findMissingModulesFromList(dependencies) {
        for (let i = 0; i < dependencies.length; i++) {
            var moduleName = dependencies[i];
            var moduleDir = path.join(this.getModulePath(), moduleName);
            if (!fs.existsSync(moduleDir)) {
                this.missingModules.push(moduleName);
            }
        }
    }
    findMissingModules() {
        this.findMissingModulesFromList(this.project.dependencies);
        this.findMissingModulesFromList(this.project.devDependencies);
    }
    ;
    installDependenciesCmd() {
        console.log("Installing missing dependencies...");
        let installCommand;
        let yarnSuccess = false;
        if (this.checkIfYarnIsInstalled()) {
            yarnSuccess = true;
            installCommand = "yarn install --force";
            if (this.project.npmRegistry) {
                this.createNpmrcFile();
            }
            if (!processUtils.runProcess(installCommand)) {
                yarnSuccess = false;
                console.log("yarn installation failed, the installation will be finished with npm");
            }
        }
        if (!yarnSuccess) {
            installCommand = "npm i";
            if (this.project.npmRegistry) {
                installCommand += " --registry " + this.project.npmRegistry;
            }
            if (!processUtils.runProcess(installCommand)) {
                throw "";
            }
        }
    }
    ;
    reinstallDependencies() {
        let moduleDirPath = this.getModulePath();
        if (fs.existsSync(moduleDirPath)) {
            console.log("Removing dependencies...");
            if (!pathUtils.recursiveRemoveDirSync(moduleDirPath)) {
                throw "Directory " + moduleDirPath + " can not be removed.";
            }
        }
        this.installDependenciesCmd();
    }
    installMissingDependencies() {
        this.findMissingModules();
        if (this.missingModules.length == 0)
            return;
        this.installDependenciesCmd();
    }
    checkIfYarnIsInstalled() {
        let yarnExists;
        if (processUtils.runProcess("npm list -g yarn")) {
            yarnExists = true;
        }
        else {
            console.log("yarn is not installed, the installation will be finished with npm");
            yarnExists = false;
        }
        return yarnExists;
    }
    createYarnrcFile() {
        let filePath = path.join(this.project.dir, ".yarnrc");
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, "registry " + '"' + this.project.npmRegistry + '"', "utf-8");
        }
    }
    createNpmrcFile() {
        let filePath = path.join(this.project.dir, ".npmrc");
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, "registry =" + this.project.npmRegistry, "utf-8");
        }
    }
    removeYarnLockFile() {
        let filePath = path.join(this.project.dir, "yarn.lock");
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
function installMissingDependencies(project) {
    try {
        let depChecker = new DependenciesChecker(project);
        depChecker.installMissingDependencies();
    }
    catch (ex) {
        console.error("Failed to install dependencies.");
        return false;
    }
    return true;
}
exports.installMissingDependencies = installMissingDependencies;
function registerCommands(c, consumeCommand) {
    c.command("dep")
        .option("-r, --reinstall", "reinstall dependencies")
        .option("-i, --install", "install dependencies")
        .action((c) => {
        consumeCommand();
        let curProjectDir = bb.currentDirectory();
        let project = bb.createProjectFromDir(curProjectDir);
        project.logCallback = (text) => {
            console.log(text);
        };
        if (!bb.refreshProjectFromPackageJson(project, null)) {
            process.exit(1);
        }
        try {
            let depChecker = new DependenciesChecker(project);
            if (c.reinstall) {
                depChecker.reinstallDependencies();
                return;
            }
            if (c.install) {
                depChecker.installMissingDependencies();
                return;
            }
        }
        catch (ex) {
            console.error("Failed to install dependencies.", ex);
            process.exit(1);
        }
    });
}
exports.registerCommands = registerCommands;
//# sourceMappingURL=dependenciesChecker.js.map