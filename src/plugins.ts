import { spawnSync } from 'child_process';
import { getUserHome } from './simpleHelpers';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";

let _workingDirectory = "";

function getBobrilHomeDirectory() {
    let homeDirectory = getUserHome();
    let bobrilHomeDir = path.join(homeDirectory, '.bb');
    return bobrilHomeDir;
}

function getPluginsDirectory() {
    let pluginsDir = path.join(getBobrilHomeDirectory(), 'node_modules');
    return pluginsDir
}

function getPluginPath(pluginName: string): string {
    let pluginPath = path.join(getPluginsDirectory(), pluginName);
    return pluginPath;
}

function isPluginInstalled(pluginName: string): boolean {
    let pluginPath = getPluginPath(pluginName);
    return fs.existsSync(pluginPath);
}

function runProcess(installCommand: string): boolean {
    console.log(installCommand);
    var subProcess = spawnSync('cmd', ['/c', installCommand], {
        cwd: _workingDirectory,
        env: process.env,
        stdio: 'inherit'
    });
    console.log();
    return subProcess.status === 0;
}

function install(pluginName: string): boolean {
    if (isPluginInstalled(pluginName)) {
        if (!uninstall(pluginName))
            return false;
    }
    let installCommand = 'npm install --prefix ' + getBobrilHomeDirectory() + ' ' + pluginName;
    if (!runProcess(installCommand)) {
        console.log('Plugin ' + pluginName + ' can not be installed.');
        return false;
    }
    return true;
}

function uninstall(pluginName: string): boolean {
    let uninstallCommand = "npm uninstall --prefix " + getBobrilHomeDirectory() + " " + pluginName;
    if (!runProcess(uninstallCommand)) {
        console.log('Plugin ' + pluginName + ' can not be uninstalled.');
        return false;
    }
    return true;
}

function link(): boolean {
    let uninstallCommand = "npm link --prefix " + getBobrilHomeDirectory();
    if (!runProcess(uninstallCommand)) {
        console.log('Plugin can not be linked.');
        return false;
    }
    return true;

}

export function registerCommands(c, commandRunningCallback) {
    c
        .command("plugin")
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
                install(c["install"]);
                return;
            }
            if (c.hasOwnProperty("uninstall")) {
                if (!c["uninstall"]) {
                    console.log("Plugin name is not specified.");
                    return;
                }
                uninstall(c["uninstall"]);
                return;
            }
            if (c.hasOwnProperty("link")) {
                link();
                return;
            }
        });
}

let plugins = null;
let pluginsLoaded = false;

function loadPluginMethods(pluginPath: string) {
    try {
        let plugin = require(pluginPath);
        for (let key in plugin) {
            let exportedMethod = plugin[key];
            if (!plugins.hasOwnProperty(key))
                plugins[key] = [];
            plugins[key].push(exportedMethod);
        }
    }
    catch (er) {
        console.log("Plugin " + pluginPath + " can not be loaded." + er);
    }
}


function loadPlugins() {
    if (pluginsLoaded) return plugins;
    pluginsLoaded = true;
    let pluginsPath = getPluginsDirectory();
    let files = fs.readdirSync(pluginsPath);
    if (files.length == 0) return null;
    plugins = {};
    try {
        for (let i = 0; i < files.length; i++) {
            let filePath = path.join(pluginsPath, files[i]);
            if (!fs.statSync(filePath).isDirectory()) return;
            loadPluginMethods(filePath);
        }
    }
    catch (er) {
        console.log(er);
    }
    return plugins;
}

export function getEntryMethod(methodName) {
    if (!pluginsLoaded) loadPlugins();
    if (plugins === null || !plugins.hasOwnProperty(methodName)) return null;

    return function () {
        for (let i = 0; i < plugins[methodName].length; i++) {
            plugins[methodName][i](arguments);
        }
    }
}

export function init(workingDirectory) {
    _workingDirectory = workingDirectory;
}
