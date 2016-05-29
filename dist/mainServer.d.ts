import * as http from 'http';
import * as longPollingServer from './longPollingServer';
import * as testServer from './testServer';
import { CompilationResultMessage } from './defs';
export declare class MainServer {
    private lastId;
    private clients;
    private svr;
    private testSvr;
    dir: string;
    constructor(testSvr: testServer.TestServer);
    handle(request: http.ServerRequest, response: http.ServerResponse): void;
    setProjectDir(dir: string): void;
    newConnection(c: longPollingServer.ILongPollingConnection): void;
    sendAll(message: string, data?: any): void;
    nofifyCompilationStarted(): void;
    notifyCompilationFinished(errors: number, warnings: number, time: number, messages: CompilationResultMessage[]): void;
    private notifyTestSvrChange();
}
