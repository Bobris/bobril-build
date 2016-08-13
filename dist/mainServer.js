"use strict";
const longPollingServer = require('./longPollingServer');
const pathPlatformDependent = require("path");
const path = pathPlatformDependent.posix; // This works everythere, just use forward slashes
const pathUtils = require("./pathUtils");
const actions = require("./actions");
const cp = require('./compileProject');
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
        this.sendAll("compilationFinished", { errors: errors, warnings: warnings, time: time, messages: messages });
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
var serverProject;
function getProject() {
    if (serverProject)
        return serverProject;
    if (exports.curProjectDir == null)
        exports.curProjectDir = pathUtils.currentDirectory();
    serverProject = cp.createProjectFromDir(exports.curProjectDir);
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
    exports.curProjectDir = proj.dir;
}
exports.setProject = setProject;
//# sourceMappingURL=mainServer.js.map