"use strict";
const longPollingServer = require('./longPollingServer');
class Client {
    constructor(owner, id, connection) {
        this.server = owner;
        this.id = id;
        this.connection = connection;
        connection.onClose = () => {
            delete this.server[this.id];
        };
        connection.onMessage = (connection, message, data) => {
            console.log("Main Message " + message, data);
            switch (message) {
            }
        };
    }
}
class MainServer {
    constructor(testSvr) {
        this.lastId = 0;
        this.testSvr = testSvr;
        this.clients = Object.create(null);
        testSvr.onChange = () => { this.notifyTestSvrChange(); };
        this.svr = new longPollingServer.LongPollingServer(c => this.newConnection(c));
    }
    handle(request, response) {
        this.svr.handle(request, response);
    }
    newConnection(c) {
        let id = "" + this.lastId++;
        let cl = new Client(this, id, c);
        this.clients[id] = cl;
        let testState = this.testSvr.getState();
        cl.connection.send("testUpdated", testState);
    }
    sendAll(message, data) {
        let kids = Object.keys(this.clients);
        for (let i = 0; i < kids.length; i++) {
            this.clients[kids[i]].connection.send(message, data);
        }
    }
    nofifyCompilationStarted() {
        this.sendAll("compilationStarted");
    }
    notifyCompilationFinished(errors, warnings, time) {
        this.sendAll("compilationFinished", { errors: errors, warnings: warnings, time: time });
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
//# sourceMappingURL=mainServer.js.map