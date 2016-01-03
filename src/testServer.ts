import * as http from 'http';
import * as longPollingServer from './longPollingServer';

export interface SuiteOrTest {
    isSuite: boolean;
    name: string;
    skipped: boolean;
    failure: boolean;
    failures: { message: string, stack: any }[];
    nested: SuiteOrTest[];
}

export interface TestResultsHolder extends SuiteOrTest {
    userAgent: string;
    jsUserAgent: string;
    running: boolean;
    testsFailed: number;
    testsSkipped: number;
    testsFinished: number;
    totalTests: number;
}

class Client {
    server: TestServer;
    id: string;
    userAgent: string;
    jsUserAgent: string;
    url: string;
    runid: number;
    idle: boolean;
    oldResults: TestResultsHolder;
    curResults: TestResultsHolder;
    suiteStack: SuiteOrTest[];
    connection: longPollingServer.ILongPollingConnection;
    constructor(owner: TestServer, id: string, connection: longPollingServer.ILongPollingConnection) {
        this.server = owner;
        this.id = id;
        this.connection = connection;
        this.idle = true;
        this.oldResults = null;
        this.curResults = null;
        connection.onClose = () => {
            delete this.server[this.id];
        };
        connection.onMessage = (connection: longPollingServer.ILongPollingConnection, message: string, data: any) => {
            console.log("Message " + message, data);
            switch (message) {
                case 'newClient': {
                    this.userAgent = connection.userAgent;
                    this.jsUserAgent = data.userAgent;
                    if (this.url)
                        this.doStart();
                    else {
                        this.connection.send("wait", null);
                    }
                    break;
                }
                case 'wholeStart': {
                    this.curResults.totalTests = <number>data;
                    this.suiteStack = [this.curResults];
                    this.server.notifyTestingStarted(this);
                    break;
                }
                case 'wholeDone': {
                    this.curResults.running = false;
                    this.oldResults = this.curResults;
                    this.curResults = null;
                    this.suiteStack = null;
                    this.server.notifyFinishedResults(this.oldResults);
                    break;
                }
                case 'suiteStart': {
                    let suite: SuiteOrTest = {
                        name: <string>data,
                        nested: [],
                        failure: false,
                        isSuite: true,
                        failures: [],
                        skipped: false
                    }
                    this.suiteStack[this.suiteStack.length - 1].nested.push(suite);
                    this.suiteStack.push(suite);
                    break;
                }
                case 'suiteDone': {
                    let suite = this.suiteStack.pop();
                    if (data.failures.length > 0)
                        suite.failures.push(...data.failures);
                    if (suite.failures.length > 0) {
                        suite.failure = true;
                        for (let i = 0; i < this.suiteStack.length; i++) {
                            this.suiteStack[i].failure = true;
                        }
                    }
                    break;
                }
                case 'testStart': {
                    let suite: SuiteOrTest = {
                        name: <string>data,
                        nested: null,
                        failure: false,
                        isSuite: false,
                        failures: [],
                        skipped: false
                    }
                    this.suiteStack[this.suiteStack.length - 1].nested.push(suite);
                    this.suiteStack.push(suite);
                    break;
                }
                case 'testDone': {
                    let test = this.suiteStack.pop();
                    if (data.failures.length > 0) test.failures.push(...data.failures);
                    this.curResults.testsFinished++;
                    if (data.status === 'passed') {
                    } else if (data.status === 'skipped') {
                        this.curResults.testsSkipped++;
                        test.skipped = true;
                    } else {
                        test.failure = true;
                        for (let i = 0; i < this.suiteStack.length; i++) {
                            this.suiteStack[i].failure = true;
                        }
                    }
                    break;
                }
            }
        }
    }
    startTest(url: string, runid: number) {
        this.url = url;
        this.runid = runid;
        this.doStart();
    }
    doStart() {
        this.idle = false;
        this.curResults = {
            userAgent: this.userAgent,
            jsUserAgent: this.jsUserAgent,
            nested: [],
            running: true,
            totalTests: null,
            testsFinished: 0,
            testsFailed: 0,
            testsSkipped: 0,
            name: "",
            failure: false,
            skipped: false,
            failures: [],
            isSuite: true
        };
        this.connection.send("test", { url: this.url });
    }
}

export class TestServer {
    lastId: number;
    url: string;
    runid: number;
    clients: { [id: string]: Client };
    svr: longPollingServer.LongPollingServer;

    constructor() {
        this.lastId = 0;
        this.runid = 0;
        this.svr = new longPollingServer.LongPollingServer(c => this.newConnection(c));
        this.clients = Object.create(null);
        this.waitOneResolver = null;
        this.waitOneTimeOut = null;
    }

    handle(request: http.ServerRequest, response: http.ServerResponse) {
        this.svr.handle(request, response);
    }

    startTest(url: string) {
        this.runid++;
        this.url = url;
        let ids = Object.keys(this.clients);
        for (let i = 0; i < ids.length; i++) {
            this.clients[ids[i]].startTest(this.url, this.runid);
        }
    }

    newConnection(c: longPollingServer.ILongPollingConnection) {
        let id = "" + this.lastId++;
        let cl = new Client(this, id, c);
        this.clients[id] = cl;
        if (this.url)
            cl.startTest(this.url, this.runid);
    }

    private waitOneResolver: (result: TestResultsHolder) => void;
    private waitOneTimeOut: NodeJS.Timer;

    notifyTestingStarted(client: Client) {
        if (this.waitOneTimeOut != null) {
            clearTimeout(this.waitOneTimeOut);
            this.waitOneTimeOut = null;
        }
    }

    notifyFinishedResults(result: TestResultsHolder) {
        if (this.waitOneResolver) {
            this.waitOneResolver(result);
            this.waitOneResolver = null;
        }
    }

    waitForOneResult(): Promise<TestResultsHolder> {
        this.waitOneTimeOut = setTimeout(() => {
            this.waitOneTimeOut = null;
            this.waitOneResolver(null);
            this.waitOneResolver = null;
        }, 10000);
        return new Promise<TestResultsHolder>((resolve, reject) => {
            this.waitOneResolver = resolve;
        });
    }
}
