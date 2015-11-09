import * as childProcess from 'child_process';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
import * as fs from "fs";

function printIntroLine() {
    let pp = pathPlatformDependent.join(__dirname, 'package.json');
    let bbPackageJson = JSON.parse(fs.readFileSync(pp, 'utf8'));
    console.log('Bobril-build ' + bbPackageJson.version + ' - ' + process.cwd());
}

function backgroundProcess() {
    let commands = Object.create(null);
    process.on("message", ({ command, param }) => {
        if (commands[command]) {
            require('./src/'+commands[command])[command](param);
        } else {
            process.send({ command:"error", param: "Unknown command "+command });            
        }
    });
    function register(name:string, file:string) {
        commands[name] = file;
    }
    register("ping","backgroundBasicCommands");
    register("stop","backgroundBasicCommands");
    register("watch","backgroundWatchCommands");
    register("initProject","backgroundCompileCommands");
    register("compile","backgroundCompileCommands");
}

function run() {
    if (process.argv[2] === "background") {
        backgroundProcess();
        return;
    }
    printIntroLine();
    require("./src/cliMain").run();
}

run();
