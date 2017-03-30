import * as http from 'http';
import * as longPollingServer from './longPollingServer';
import * as testServer from './testServer';
import { CompilationResultMessage } from './defs';
import * as cc from './compilationCache';
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
    notifyActionsChanged(): void;
    notifyCompilationStarted(): void;
    notifyCompilationFinished(errors: number, warnings: number, time: number, messages: CompilationResultMessage[]): void;
    private notifyTestSvrChange();
}
export declare function getCurProjectDir(): string;
export declare function setCurProjectDir(value: string): void;
export declare function getInteractivePort(): number;
export declare function setInteractivePort(value: number): void;
export declare function getProject(): cc.IProject;
export declare function setProject(proj: cc.IProject): void;
