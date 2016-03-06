import * as http from 'http';
import * as longPollingServer from './longPollingServer';
import * as testServer from './testServer';

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
            console.log("Main Message " + message, data);
            switch (message) {
            }
        }
    }

}

export class MainServer {
    private lastId: number;
    private clients: { [id: string]: Client };
    private svr: longPollingServer.LongPollingServer;
    private testSvr: testServer.TestServer;

    constructor(testSvr: testServer.TestServer) {
        this.lastId = 0;
        this.testSvr = testSvr;
        this.clients = Object.create(null);
        testSvr.onChange = () => { this.notifyTestSvrChange(); };
        this.svr = new longPollingServer.LongPollingServer(c => this.newConnection(c));
    }

    handle(request: http.ServerRequest, response: http.ServerResponse) {
        this.svr.handle(request, response);
    }

    newConnection(c: longPollingServer.ILongPollingConnection) {
        let id = "" + this.lastId++;
        let cl = new Client(this, id, c);
        this.clients[id] = cl;
        let testState = this.testSvr.getState();
        cl.connection.send("testUpdated", testState);
    }

    private sendAll(message:string, data?: any) {
        let kids = Object.keys(this.clients);
        for (let i = 0; i < kids.length; i++) {
            this.clients[kids[i]].connection.send(message, data);
        }
    }

    nofifyCompilationStarted() {
        this.sendAll("compilationStarted");
    }
     
    notifyCompilationFinished(errors: number, warnings: number, time: number) {
        this.sendAll("compilationFinished", { errors, warnings, time });
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
