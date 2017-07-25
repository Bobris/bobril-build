import * as http from 'http';
import * as longPollingServer from './longPollingServer';
import * as testServer from './testServer';
import { CompilationResultMessage } from './defs';
import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everywhere, just use forward slashes
import * as pathUtils from "./pathUtils";
import * as actions from "./actions";
import * as cc from './compilationCache';
import * as cp from './compileProject';
import * as bb from './index';

class Client {
    server: MainServer;
    id: string;
    connection: longPollingServer.ILongPollingConnection;
    constructor(owner: MainServer, id: string, connection: longPollingServer.ILongPollingConnection) {
        this.server = owner;
        this.id = id;
        this.connection = connection;
        connection.onClose = () => {
            delete this.server[this.id];
        };
        connection.onMessage = (connection: longPollingServer.ILongPollingConnection, message: string, data: any) => {
            switch (message) {
                case "focusPlace": {
                    this.server.sendAll(message, { fn: pathUtils.join(this.server.dir, data.fn), pos: data.pos });
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
        }
    }

}

export class MainServer {
    private lastId: number;
    private clients: { [id: string]: Client };
    private svr: longPollingServer.LongPollingServer;
    private testSvr: testServer.TestServer;
    dir: string;

    constructor(testSvr: testServer.TestServer) {
        this.dir = "";
        this.lastId = 0;
        this.testSvr = testSvr;
        this.clients = Object.create(null);
        testSvr.onChange = () => { this.notifyTestSvrChange(); };
        this.svr = new longPollingServer.LongPollingServer(c => this.newConnection(c));
        actions.actionList.refreshCallBack = () => {
            this.notifyActionsChanged();
        }
    }

    handle(request: http.ServerRequest, response: http.ServerResponse) {
        this.svr.handle(request, response);
    }

    setProjectDir(dir: string) {
        this.dir = dir;
    }

    newConnection(c: longPollingServer.ILongPollingConnection) {
        let id = "" + this.lastId++;
        let cl = new Client(this, id, c);
        this.clients[id] = cl;
        let testState = this.testSvr.getState();
        cl.connection.send("testUpdated", testState);
        cl.connection.send("actionsRefresh", actions.actionList.getList());
        cl.connection.send("setLiveReload", { value: getProject().liveReloadEnabled });
    }

    sendAll(message: string, data?: any) {
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

    notifyCompilationFinished(errors: number, warnings: number, time: number, messages: CompilationResultMessage[]) {
        this.sendAll("compilationFinished", { errors, warnings, time, messages });
    }

    private notifyTestSvrChange() {
        let kids = Object.keys(this.clients);
        if (kids.length == 0) return;
        let testState = this.testSvr.getState();
        for (let i = 0; i < kids.length; i++) {
            this.clients[kids[i]].connection.send("testUpdated", testState);
        }
    }
}

let curProjectDir: string;

export function getCurProjectDir() {
    return curProjectDir;
}

export function setCurProjectDir(value: string) {
    curProjectDir = value;
}

let interactivePort: number;

export function getInteractivePort() {
    return interactivePort;
}

export function setInteractivePort(value: number) {
    interactivePort = value;
}

var serverProject: cc.IProject;

export function getProject(): cc.IProject {
    if (serverProject) return serverProject;
    if (curProjectDir == null) curProjectDir = pathUtils.currentDirectory();
    serverProject = cp.createProjectFromDir(curProjectDir);
    serverProject.logCallback = (text) => {
        console.log(text);
    }
    if (!cp.refreshProjectFromPackageJson(serverProject, null)) {
        process.exit(1);
    }
    return serverProject;
}

export function setProject(proj: cc.IProject) {
    serverProject = proj;
    curProjectDir = proj.dir;
}
