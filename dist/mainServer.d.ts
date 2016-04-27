import * as http from 'http';
import * as longPollingServer from './longPollingServer';
import * as testServer from './testServer';
export declare class MainServer {
    private lastId;
    private clients;
    private svr;
    private testSvr;
    constructor(testSvr: testServer.TestServer);
    handle(request: http.ServerRequest, response: http.ServerResponse): void;
    newConnection(c: longPollingServer.ILongPollingConnection): void;
    private sendAll(message, data?);
    nofifyCompilationStarted(): void;
    notifyCompilationFinished(errors: number, warnings: number, time: number): void;
    private notifyTestSvrChange();
}
