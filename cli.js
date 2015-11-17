var pathPlatformDependent = require("path");
var path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
var fs = require("fs");
function printIntroLine() {
    var pp = pathPlatformDependent.join(__dirname, 'package.json');
    var bbPackageJson = JSON.parse(fs.readFileSync(pp, 'utf8'));
    console.log('Bobril-build ' + bbPackageJson.version + ' - ' + process.cwd());
}
function backgroundProcess() {
    var commands = Object.create(null);
    process.on("message", function (_a) {
        var command = _a.command, param = _a.param;
        if (commands[command]) {
            require('./src/' + commands[command])[command](param);
        }
        else {
            process.send({ command: "error", param: "Unknown command " + command });
        }
    });
    function register(name, file) {
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
