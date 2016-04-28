import { spawnSync } from 'child_process';
import { getUserHome } from './simpleHelpers';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";

export enum EntryMethodType {
    registerCommands,
    afterStartCompileProcess,
    initPluginLoader,
}

export interface IPluginLoader {
    executeEntryMethod(methodType: EntryMethodType, ...args);
    registerCommands(c, commandRunningCallback);
}

class PluginLoader implements IPluginLoader {
    plugins = null;
    pluginsLoaded = false;
    __dirname: string;
    cmdToolName = "npm";

    constructor(__dirname) {
        this.__dirname = __dirname;
    }

    getBobrilHomeDirectory() {
        let homeDirectory = getUserHome();
        let bobrilHomeDir = path.join(homeDirectory, '.bb');
        return bobrilHomeDir;
    }

    getPluginsDirectory() {
        let pluginsDir = path.join(this.getBobrilHomeDirectory(), 'node_modules');
        return pluginsDir
    }

    getPluginPath(pluginName: string): string {
        let pluginPath = path.join(this.getPluginsDirectory(), pluginName);
        return pluginPath;
    }

    isPluginInstalled(pluginName: string): boolean {
        let pluginPath = this.getPluginPath(pluginName);
        return fs.existsSync(pluginPath);
    }

    runProcess(installCommand: string): boolean {
        var subProcess = spawnSync('cmd', ['/c', installCommand], {
            cwd: this.__dirname,
            env: process.env,
            stdio: 'inherit'
        });
        console.log();
        return subProcess.status === 0;
    }

    install(pluginName: string): boolean {
        if (this.isPluginInstalled(pluginName)) {
            if (!this.uninstall(pluginName))
                return false;
        }
        let installCommand = this.cmdToolName + ' install --prefix ' + this.escapeCmdPath(this.getBobrilHomeDirectory()) + ' ' + pluginName;
        if (!this.runProcess(installCommand)) {
            console.log('Plugin ' + pluginName + ' can not be installed.');
            return false;
        }
        return true;
    }

    uninstall(pluginName: string): boolean {
        let uninstallCommand = this.cmdToolName + " uninstall --prefix " + this.escapeCmdPath(this.getBobrilHomeDirectory()) + " " + pluginName;
        if (!this.runProcess(uninstallCommand)) {
            console.log('Plugin ' + pluginName + ' can not be uninstalled.');
            return false;
        }
        return true;
    }

    link(): boolean {
        let workingDirectory = path.resolve(".");
        workingDirectory = workingDirectory.replace(/\\/g, '/');
        let pluginName = path.basename(workingDirectory);
        if (this.isPluginInstalled(pluginName)) {
            if (!this.uninstall(pluginName))
                return false;
        }
        let link = this.escapeCmdPath(path.join(this.getPluginsDirectory(), pluginName));
        let target = this.escapeCmdPath(workingDirectory);

        let linkCommand = 'mklink /J ' + link + ' ' + target + '';
        if (!this.runProcess(linkCommand)) {
            console.log('Plugin can not be linked.');
            return false;
        }
        return true;
    }

    escapeCmdPath(path) {
        return path.replace(/\//g, '\\');
    }

    loadPluginMethods(pluginPath: string) {
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
        if (this.pluginsLoaded) return;
        this.pluginsLoaded = true;
        let pluginsPath = this.getPluginsDirectory();
        if (!fs.existsSync(pluginsPath)) return null;
        let files = fs.readdirSync(pluginsPath);
        if (files.length == 0) return null;
        this.plugins = {};
        try {
            for (let i = 0; i < files.length; i++) {
                let filePath = path.join(pluginsPath, files[i]);
                if (!fs.statSync(filePath).isDirectory()) return;
                this.loadPluginMethods(filePath);
            }
        }
        catch (er) {
            console.log(er);
        }
    }

    executeEntryMethod(methodType: EntryMethodType, ...args): Array<any> {
        if (!this.pluginsLoaded) this.loadPlugins();
        let methodName = EntryMethodType[methodType];
        if (this.plugins === null || !this.plugins.hasOwnProperty(methodName)) return [];
        let result = [];
        for (let i = 0; i < this.plugins[methodName].length; i++) {
            try {
                let res = this.plugins[methodName][i].method.apply(null, args);
                if (res == undefined) continue;
                result.push(res);
            }
            catch (ex) {
                console.log("Execute plugins method " + EntryMethodType[methodType] + " faild." + ex);
            }
        }
        return result;
    }

    registerCommands(c, commandRunningCallback) {
        c
            .command("plugins")
            .option("-i, --install <pluginName>", "install plugin")
            .option("-u, --uninstall <pluginName>", "uninstall plugin")
            .option("-l, --link", "link plugin")
            .action((c) => {
                commandRunningCallback(true);
                if (c.hasOwnProperty("install")) {
                    if (!c["install"]) {
                        console.log("Plugin name is not specified.");
                        return;
                    }
                    this.install(c["install"]);
                    return;
                }
                if (c.hasOwnProperty("uninstall")) {
                    if (!c["uninstall"]) {
                        console.log("Plugin name is not specified.");
                        return;
                    }
                    this.uninstall(c["uninstall"]);
                    return;
                }
                if (c.hasOwnProperty("link")) {
                    this.link();
                    return;
                }
            });
    }

}

export let pluginsLoader: IPluginLoader;

export function init(workingDirector: string) {
    pluginsLoader = new PluginLoader(workingDirector);
    pluginsLoader.executeEntryMethod(EntryMethodType.initPluginLoader, pluginsLoader);
}