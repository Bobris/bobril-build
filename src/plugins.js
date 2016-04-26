"use strict";
var child_process_1 = require('child_process');
var simpleHelpers_1 = require('./simpleHelpers');
var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require("fs");
var _workingDirectory = "";
function getBobrilHomeDirectory() {
    var homeDirectory = simpleHelpers_1.getUserHome();
    var bobrilHomeDir = path.join(homeDirectory, '.bb');
    return bobrilHomeDir;
}
function getPluginsDirectory() {
    var pluginsDir = path.join(getBobrilHomeDirectory(), 'node_modules');
    return pluginsDir;
}
function getPluginPath(pluginName) {
    var pluginPath = path.join(getPluginsDirectory(), pluginName);
    return pluginPath;
}
function isPluginInstalled(pluginName) {
    var pluginPath = getPluginPath(pluginName);
    return fs.existsSync(pluginPath);
}
function runProcess(installCommand) {
    console.log(installCommand);
    var subProcess = child_process_1.spawnSync('cmd', ['/c', installCommand], {
        cwd: _workingDirectory,
        env: process.env,
        stdio: 'inherit'
    });
    console.log();
    return subProcess.status === 0;
}
function install(pluginName) {
    if (isPluginInstalled(pluginName)) {
        if (!uninstall(pluginName))
            return false;
    }
    var installCommand = 'npm install --prefix ' + getBobrilHomeDirectory() + ' ' + pluginName;
    if (!runProcess(installCommand)) {
        console.log('Plugin ' + pluginName + ' can not be installed.');
        return false;
    }
    return true;
}
function uninstall(pluginName) {
    var uninstallCommand = "npm uninstall --prefix " + getBobrilHomeDirectory() + " " + pluginName;
    if (!runProcess(uninstallCommand)) {
        console.log('Plugin ' + pluginName + ' can not be uninstalled.');
        return false;
    }
    return true;
}
function link() {
    var uninstallCommand = "npm link --prefix " + getBobrilHomeDirectory();
    if (!runProcess(uninstallCommand)) {
        console.log('Plugin can not be linked.');
        return false;
    }
    return true;
}
function registerCommands(c, commandRunningCallback) {
    c
        .command("plugin")
        .option("-i, --install <pluginName>", "install plugin")
        .option("-u, --uninstall <pluginName>", "uninstall plugin")
        .option("-l, --link", "link plugin")
        .action(function (c) {
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
exports.registerCommands = registerCommands;
var plugins = null;
var pluginsLoaded = false;
function loadPluginMethods(pluginPath) {
    try {
        var plugin = require(pluginPath);
        for (var key in plugin) {
            var exportedMethod = plugin[key];
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
    if (pluginsLoaded)
        return plugins;
    pluginsLoaded = true;
    var pluginsPath = getPluginsDirectory();
    if (!fs.existsSync(pluginsPath))
        return null;
    var files = fs.readdirSync(pluginsPath);
    if (files.length == 0)
        return null;
    plugins = {};
    try {
        for (var i = 0; i < files.length; i++) {
            var filePath = path.join(pluginsPath, files[i]);
            if (!fs.statSync(filePath).isDirectory())
                return;
            loadPluginMethods(filePath);
        }
    }
    catch (er) {
        console.log(er);
    }
    return plugins;
}
function getEntryMethod(methodName) {
    if (!pluginsLoaded)
        loadPlugins();
    if (plugins === null || !plugins.hasOwnProperty(methodName))
        return null;
    return function () {
        for (var i = 0; i < plugins[methodName].length; i++) {
            plugins[methodName][i](arguments);
        }
    };
}
exports.getEntryMethod = getEntryMethod;
function init(workingDirectory) {
    _workingDirectory = workingDirectory;
}
exports.init = init;
