"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const longPollingServer = require("./longPollingServer");
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everywhere, just use forward slashes
const pathUtils = require("./pathUtils");
const actions = require("./actions");
const cp = require("./compileProject");
const bb = require("./index");
class Client {
    constructor(owner, id, connection) {
        this.server = owner;
        this.id = id;
        this.connection = connection;
        connection.onClose = () => {
            delete this.server[this.id];
        };
        connection.onMessage = (connection, message, data) => {
            switch (message) {
                case "focusPlace": {
                    this.server.sendAll(message, { fn: path.join(this.server.dir, data.fn), pos: data.pos });
                    break;
                }
                case "runAction": {
                    actions.actionList.invokeAction(data.id);
                    break;
                }
                case "setLiveReload": {
                    let project = getProject();
                    project.liveReloadEnabled = data.value;
                    bb.updateProjectOptions().then(bb.forceInteractiveRecompile);
                    this.server.sendAll("setLiveReload", data);
                    break;
                }
                default: {
                    console.log("Main Message " + message, data);
                    break;
                }
            }
        };
    }
}
class MainServer {
    constructor(testSvr) {
        this.dir = "";
        this.lastId = 0;
        this.testSvr = testSvr;
        this.clients = Object.create(null);
        testSvr.onChange = () => { this.notifyTestSvrChange(); };
        this.svr = new longPollingServer.LongPollingServer(c => this.newConnection(c));
        actions.actionList.refreshCallBack = () => {
            this.notifyActionsChanged();
        };
    }
    handle(request, response) {
        this.svr.handle(request, response);
    }
    setProjectDir(dir) {
        this.dir = dir;
    }
    newConnection(c) {
        let id = "" + this.lastId++;
        let cl = new Client(this, id, c);
        this.clients[id] = cl;
        let testState = this.testSvr.getState();
        cl.connection.send("testUpdated", testState);
        cl.connection.send("actionsRefresh", actions.actionList.getList());
        cl.connection.send("setLiveReload", { value: getProject().liveReloadEnabled });
    }
    sendAll(message, data) {
        let kids = Object.keys(this.clients);
        for (let i = 0; i < kids.length; i++) {
            this.clients[kids[i]].connection.send(message, data);
        }
    }
    notifyActionsChanged() {
        this.sendAll("actionsRefresh", actions.actionList.getList());
    }
    notifyCompilationStarted() {
        this.sendAll("compilationStarted");
    }
    notifyCompilationFinished(errors, warnings, time, messages) {
        this.sendAll("compilationFinished", { errors, warnings, time, messages });
    }
    notifyTestSvrChange() {
        let kids = Object.keys(this.clients);
        if (kids.length == 0)
            return;
        let testState = this.testSvr.getState();
        for (let i = 0; i < kids.length; i++) {
            this.clients[kids[i]].connection.send("testUpdated", testState);
        }
    }
}
exports.MainServer = MainServer;
let curProjectDir;
function getCurProjectDir() {
    return curProjectDir;
}
exports.getCurProjectDir = getCurProjectDir;
function setCurProjectDir(value) {
    curProjectDir = value;
}
exports.setCurProjectDir = setCurProjectDir;
let interactivePort;
function getInteractivePort() {
    return interactivePort;
}
exports.getInteractivePort = getInteractivePort;
function setInteractivePort(value) {
    interactivePort = value;
}
exports.setInteractivePort = setInteractivePort;
var serverProject;
function getProject() {
    if (serverProject)
        return serverProject;
    if (curProjectDir == null)
        curProjectDir = pathUtils.currentDirectory();
    serverProject = cp.createProjectFromDir(curProjectDir);
    serverProject.logCallback = (text) => {
        console.log(text);
    };
    if (!cp.refreshProjectFromPackageJson(serverProject, null)) {
        process.exit(1);
    }
    return serverProject;
}
exports.getProject = getProject;
function setProject(proj) {
    serverProject = proj;
    curProjectDir = proj.dir;
}
exports.setProject = setProject;
//# sourceMappingURL=mainServer.js.map