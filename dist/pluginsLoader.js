"use strict";
const processUtils = require('./processUtils');
const simpleHelpers_1 = require('./simpleHelpers');
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
const fs = require("fs");
const pathUtils = require("./pathUtils");
(function (EntryMethodType) {
    EntryMethodType[EntryMethodType["registerCommands"] = 0] = "registerCommands";
    EntryMethodType[EntryMethodType["afterStartCompileProcess"] = 1] = "afterStartCompileProcess";
    EntryMethodType[EntryMethodType["initPluginLoader"] = 2] = "initPluginLoader";
})(exports.EntryMethodType || (exports.EntryMethodType = {}));
var EntryMethodType = exports.EntryMethodType;
class PluginLoader {
    constructor(__dirname) {
        this.plugins = null;
        this.pluginsLoaded = false;
        this.cmdToolName = "npm";
        this.__dirname = __dirname;
    }
    getBobrilHomeDirectory() {
        let homeDirectory = simpleHelpers_1.getUserHome();
        let bobrilHomeDir = path.join(homeDirectory, '.bb');
        return bobrilHomeDir;
    }
    getPluginsDirectory() {
        let pluginsDir = path.join(this.getBobrilHomeDirectory(), 'node_modules');
        return pluginsDir;
    }
    getPluginPath(pluginName) {
        let pluginPath = path.join(this.getPluginsDirectory(), pluginName);
        return pluginPath;
    }
    isPluginInstalled(pluginName) {
        let pluginPath = this.getPluginPath(pluginName);
        return fs.existsSync(pluginPath);
    }
    listInstalledPlugins() {
        console.log('\nList of installed bobril plugins:\n----------------------------------');
        let dir = this.getPluginsDirectory();
        fs.readdirSync(dir).filter((file) => {
            return fs.statSync(path.join(dir, file)).isDirectory();
        }).forEach((pluginDir) => {
            let packageFile = path.join(dir, pluginDir, 'package.json');
            let obj = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
            console.log(obj._id);
        });
    }
    install(pluginName) {
        if (this.isPluginInstalled(pluginName)) {
            if (!this.uninstall(pluginName))
                return false;
        }
        let installCommand = this.cmdToolName + ' install --prefix ' + this.escapeCmdPath(this.getBobrilHomeDirectory()) + ' ' + pluginName;
        if (!processUtils.runProcess(installCommand)) {
            console.log('Plugin ' + pluginName + ' can not be installed.');
            return false;
        }
        return true;
    }
    uninstall(pluginName) {
        let uninstallCommand = this.cmdToolName + " uninstall --prefix " + this.escapeCmdPath(this.getBobrilHomeDirectory()) + " " + pluginName;
        if (!processUtils.runProcess(uninstallCommand)) {
            console.log('Plugin ' + pluginName + ' can not be uninstalled.');
            return false;
        }
        return true;
    }
    link() {
        let workingDirectory = path.resolve(".");
        workingDirectory = workingDirectory.replace(/\\/g, '/');
        let pluginName = path.basename(workingDirectory);
        if (this.isPluginInstalled(pluginName)) {
            if (!this.uninstall(pluginName))
                return false;
        }
        let link = this.escapeCmdPath(path.join(this.getPluginsDirectory(), pluginName));
        let target = this.escapeCmdPath(workingDirectory);
        if (!fs.existsSync(link)) {
            pathUtils.mkpathsync(path.dirname(pathUtils.normalizePath(link)));
        }
        let linkCommand = 'mklink /J ' + link + ' ' + target + '';
        if (!processUtils.runProcess(linkCommand)) {
            console.log('Plugin can not be linked.');
            return false;
        }
        return true;
    }
    escapeCmdPath(path) {
        return path.replace(/\//g, '\\');
    }
    loadPluginMethods(pluginPath) {
        try {
            let plugin = require(pluginPath);
            for (let key in plugin) {
                let exportedMethod = plugin[key];
                if (!this.plugins.hasOwnProperty(key))
                    this.plugins[key] = [];
                this.plugins[key].push({ 'name': path.basename(pluginPath), 'method': exportedMethod });
            }
        }
        catch (er) {
            console.log("Plugin " + pluginPath + " can not be loaded." + er);
        }
    }
    loadPlugins() {
        if (this.pluginsLoaded)
            return;
        this.pluginsLoaded = true;
        let pluginsPath = this.getPluginsDirectory();
        if (!fs.existsSync(pluginsPath))
            return null;
        let files = fs.readdirSync(pluginsPath);
        if (files.length == 0)
            return null;
        this.plugins = {};
        try {
            for (let i = 0; i < files.length; i++) {
                let filePath = path.join(pluginsPath, files[i]);
                if (!fs.statSync(filePath).isDirectory())
                    return;
                this.loadPluginMethods(filePath);
            }
        }
        catch (er) {
            console.log(er);
        }
    }
    executeEntryMethod(methodType, ...args) {
        if (!this.pluginsLoaded)
            this.loadPlugins();
        let methodName = EntryMethodType[methodType];
        if (this.plugins === null || !this.plugins.hasOwnProperty(methodName))
            return [];
        let result = [];
        for (let i = 0; i < this.plugins[methodName].length; i++) {
            try {
                let res = this.plugins[methodName][i].method.apply(null, args);
                if (res == undefined)
                    continue;
                result.push(res);
            }
            catch (ex) {
                console.log("Execute plugins method " + EntryMethodType[methodType] + " faild." + ex);
            }
        }
        return result;
    }
    registerCommands(c, consumeCommand) {
        c
            .command("plugins")
            .option("-l, --list", "list installed plugins")
            .option("-i, --install <pluginName>", "install plugin")
            .option("-u, --uninstall <pluginName>", "uninstall plugin")
            .option("-s, --link", "link plugin")
            .action((c) => {
            consumeCommand(true);
            if (c.hasOwnProperty("install")) {
                if (!c["install"]) {
                    console.log("Plugin name is not specified.");
                    process.exit(1);
                }
                this.install(c["install"]);
                process.exit(0);
            }
            if (c.hasOwnProperty("uninstall")) {
                if (!c["uninstall"]) {
                    console.log("Plugin name is not specified.");
                    process.exit(1);
                }
                this.uninstall(c["uninstall"]);
                process.exit(0);
            }
            if (c.hasOwnProperty("link")) {
                this.link();
                process.exit(0);
            }
            if (c.hasOwnProperty("list")) {
                this.listInstalledPlugins();
                process.exit(0);
            }
        });
    }
}
function init(workingDirector) {
    exports.pluginsLoader = new PluginLoader(workingDirector);
    exports.pluginsLoader.executeEntryMethod(EntryMethodType.initPluginLoader, exports.pluginsLoader);
}
exports.init = init;
//# sourceMappingURL=pluginsLoader.js.map