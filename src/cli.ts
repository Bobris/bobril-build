import * as childProcess from 'child_process';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";
import * as plugins from "./pluginsLoader";
import * as Module from "module";

const bbDirRoot = path.dirname(__dirname.replace(/\\/g, "/"));
function printIntroLine() {
    let pp = pathPlatformDependent.join(__dirname, '../package.json');
    let bbPackageJson = JSON.parse(fs.readFileSync(pp, 'utf8'));
    console.log('Bobril-build ' + bbPackageJson.version + ' - ' + process.cwd());
}

function backgroundProcess() {
    let commands = Object.create(null);
    process.on("message", ({ command, param }) => {
        //console.log(command, param);
        if (commands[command]) {
            require('./' + commands[command])[command](param);
        }
        else if (command == 'callPlugins') {
            let methodName = param['method'];
            require('./backgroundCompileCommands')['executePlugins'](param);
        }
        else {
            process.send({ command: "error", param: "Unknown command " + command });
        }
    });
    function register(name: string, file: string) {
        commands[name] = file;
    }
    register("ping", "backgroundBasicCommands");
    register("stop", "backgroundBasicCommands");
    register("watch", "backgroundWatchCommands");
    register("createProject", "backgroundCompileCommands");
    register("refreshProject", "backgroundCompileCommands");
    register("setProjectOptions", "backgroundCompileCommands");
    register("disposeProject", "backgroundCompileCommands");
    register("compile", "backgroundCompileCommands");
    register("loadTranslations", "backgroundCompileCommands");
    register("installDependencies", "backgroundCompileCommands");
}

function run() {
    const originalLoader = Module._load;
    (<any>Module)._load = function (request, parent) {
        if (request === "bobril-build") {
            return require("./index");
        }
        return originalLoader.apply(this, arguments);
    };
    plugins.init(__dirname);
    if (process.argv[2] === "background") {
        backgroundProcess();
        return;
    }
    printIntroLine();
    require("./cliMain").run();
}

run();
