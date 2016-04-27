import * as http from 'http';
import * as longPollingServer from './longPollingServer';
import { StackFrame } from 'stackframe';
import * as sourceMap from './sourceMap';
export declare type MessageAndStack = {
    message: string;
    stack: StackFrame[];
};
export interface SuiteOrTest {
    isSuite: boolean;
    name: string;
    skipped: boolean;
    failure: boolean;
    duration: number;
    failures: MessageAndStack[];
    nested: SuiteOrTest[];
    logs: MessageAndStack[];
}
export interface TestResultsHolder extends SuiteOrTest {
    userAgent: string;
    running: boolean;
    testsFailed: number;
    testsSkipped: number;
    testsFinished: number;
    totalTests: number;
}
export interface TestSvrState {
    agents: TestResultsHolder[];
}
export declare function toJUnitXml(results: TestResultsHolder): Buffer;
export declare class TestServer {
    private lastId;
    url: string;
    private runid;
    private clients;
    private svr;
    sourceMapCache: {
        [loc: string]: sourceMap.SourceMap;
    };
    getSource: (loc: string) => Buffer;
    onChange: () => void;
    notifySomeChange: () => void;
    constructor();
    deleteClientById(id: string): void;
    handle(request: http.ServerRequest, response: http.ServerResponse): void;
    startTest(url: string): void;
    newConnection(c: longPollingServer.ILongPollingConnection): void;
    private waitOneResolver;
    private waitOneTimeOut;
    notifyTestingStarted(): void;
    notifyFinishedResults(result: TestResultsHolder): void;
    waitForOneResult(): Promise<TestResultsHolder>;
    getState(): TestSvrState;
}
