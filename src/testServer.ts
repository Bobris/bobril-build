import * as http from 'http';
import * as longPollingServer from './longPollingServer';
import { debounce } from './debounce';
import { StackFrame } from 'stackframe';
import * as stackTrace from './stackTrace';
import * as sourceMap from './sourceMap';
import * as xmlWriter from './xmlWriter';

let uaparse: (userAgent: string, jsUserAgent: string) => Object = require('useragent').parse;

export type MessageAndStack = { message: string, stack: StackFrame[] };

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

function writeJUnitSystemOut(w: xmlWriter.XmlWritter, test: SuiteOrTest) {
    if (!test.logs || test.logs.length == 0) return;
    w.beginElementPreserveSpaces("system-out", true);
    test.logs.forEach(m => {
        w.addPCData(m.message + "\n  " + m.stack.join("\n  ") + "\n");
    });
    w.endElement();
}

function recursiveWriteJUnit(w: xmlWriter.XmlWritter, suite: SuiteOrTest, name: string) {
    let duration = 0;
    let count = 0;
    let flat = true;
    suite.nested.forEach(n => {
        if (n.isSuite) {
            flat = false;
            return;
        }
        count++;
        duration += n.duration;
    });
    if (flat) duration = suite.duration;
    if (count > 0) {
        w.beginElement("testsuite");
        w.addAttribute("name", name || "root");
        w.addAttribute("time", (duration * 0.001).toFixed(4));
        suite.nested.forEach(test => {
            if (test.isSuite) return;
            w.beginElement("testcase");
            w.addAttribute("name", test.name);
            w.addAttribute("time", (test.duration * 0.001).toFixed(4));
            if (test.skipped) {
                w.beginElement("skipped");
                w.endElement();
            } else if (test.failure) {
                test.failures.forEach(fail => {
                    w.beginElement("failure");
                    w.addAttribute("message", fail.message + "\n" + fail.stack.join("\n"));
                    w.endElement();
                });
            }
            writeJUnitSystemOut(w, test);
            w.endElement();
        });
        writeJUnitSystemOut(w, suite);
        w.endElement();
    }
    if (!flat) {
        suite.nested.forEach(n => {
            if (n.isSuite) {
                recursiveWriteJUnit(w, n, (name ? name + "." : "") + n.name);
            }
        });
    }
}

export function toJUnitXml(results: TestResultsHolder): Buffer {
    let w = new xmlWriter.XmlWritter(true);
    w.writeHeader();
    w.beginElement("testsuites");
    w.addAttribute("errors", "0");
    w.addAttribute("failures", "" + results.testsFailed);
    w.addAttribute("tests", "" + results.totalTests);
    w.addAttribute("time", (results.duration * 0.001).toFixed(4));
    recursiveWriteJUnit(w, results, "");
    w.endElement();
    return w.getBuffer();
}

class Client {
    server: TestServer;
    id: string;
    userAgent: string;
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
            this.server.deleteClientById(this.id);
            this.server.notifySomeChange();
        };
        connection.onMessage = (connection: longPollingServer.ILongPollingConnection, message: string, data: any) => {
            // console.log("Test Message " + message);
            switch (message) {
                case 'newClient': {
                    this.userAgent = uaparse(connection.userAgent, data.userAgent).toString()
                    if (this.url)
                        this.doStart();
                    else {
                        this.connection.send("wait", null);
                    }
                    this.server.notifySomeChange();
                    break;
                }
                case 'wholeStart': {
                    if (this.curResults == null) break;
                    this.curResults.totalTests = <number>data;
                    this.suiteStack = [this.curResults];
                    this.server.notifyTestingStarted();
                    this.server.notifySomeChange();
                    break;
                }
                case 'wholeDone': {
                    if (this.curResults == null) break;
                    if (this.suiteStack == null) break;
                    this.curResults.duration = <number>data;
                    this.curResults.running = false;
                    this.oldResults = this.curResults;
                    this.curResults = null;
                    this.suiteStack = null;
                    this.server.notifyFinishedResults(this.oldResults);
                    this.server.notifySomeChange();
                    break;
                }
                case 'suiteStart': {
                    if (this.curResults == null) break;
                    if (this.suiteStack == null) break;
                    let suite: SuiteOrTest = {
                        name: <string>data,
                        nested: [],
                        duration: 0,
                        failure: false,
                        isSuite: true,
                        failures: [],
                        skipped: false,
                        logs: []
                    }
                    this.suiteStack[this.suiteStack.length - 1].nested.push(suite);
                    this.suiteStack.push(suite);
                    this.server.notifySomeChange();
                    break;
                }
                case 'suiteDone': {
                    if (this.curResults == null) break;
                    if (this.suiteStack == null) break;
                    let suite = this.suiteStack.pop();
                    suite.duration = data.duration;
                    if (data.failures.length > 0)
                        suite.failures.push(...this.convertFailures(data.failures));
                    if (suite.failures.length > 0) {
                        suite.failure = true;
                        for (let i = 0; i < this.suiteStack.length; i++) {
                            this.suiteStack[i].failure = true;
                        }
                    }
                    this.server.notifySomeChange();
                    break;
                }
                case 'testStart': {
                    if (this.curResults == null) break;
                    if (this.suiteStack == null) break;
                    let test: SuiteOrTest = {
                        name: <string>data,
                        nested: null,
                        duration: 0,
                        failure: false,
                        isSuite: false,
                        failures: [],
                        skipped: false,
                        logs: []
                    }
                    this.suiteStack[this.suiteStack.length - 1].nested.push(test);
                    this.suiteStack.push(test);
                    this.server.notifySomeChange();
                    break;
                }
                case 'testDone': {
                    if (this.curResults == null) break;
                    if (this.suiteStack == null) break;
                    let test = this.suiteStack.pop();
                    test.duration = data.duration;
                    if (data.failures.length > 0) test.failures.push(...this.convertFailures(data.failures));
                    this.curResults.testsFinished++;
                    if (data.status === 'passed') {
                    } else if (data.status === 'skipped') {
                        this.curResults.testsSkipped++;
                        test.skipped = true;
                    } else {
                        this.curResults.testsFailed++;
                        test.failure = true;
                        for (let i = 0; i < this.suiteStack.length; i++) {
                            this.suiteStack[i].failure = true;
                        }
                    }
                    this.server.notifySomeChange();
                    break;
                }
                case 'consoleLog': {
                    if (this.curResults == null) break;
                    if (this.suiteStack == null) break;
                    let test = this.suiteStack[this.suiteStack.length - 1];
                    test.logs.push(this.convertMessageAndStack(data));
                    this.server.notifySomeChange();
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

    private initCurResults() {
        this.curResults = {
            userAgent: this.userAgent,
            nested: [],
            duration: 0,
            running: true,
            totalTests: null,
            testsFinished: 0,
            testsFailed: 0,
            testsSkipped: 0,
            name: "",
            failure: false,
            skipped: false,
            failures: [],
            isSuite: true,
            logs: []
        };
    }

    doStart() {
        this.idle = false;
        this.initCurResults();
        this.connection.send("test", { url: this.url });
    }

    convertMessageAndStack(rawMessage: { message: string, stack: string }): MessageAndStack {
        let st = stackTrace.parseStack(rawMessage.stack);
        st = stackTrace.enhanceStack(st, this.server.getSource, this.server.sourceMapCache);
        st = st.filter((fr) => !/^http\:\/\//g.test(fr.fileName));
        return { message: rawMessage.message, stack: st };
    }

    convertFailures(rawFailures: { message: string, stack: string }[]): MessageAndStack[] {
        return rawFailures.map(rf => this.convertMessageAndStack(rf));
    }
}

export class TestServer {
    private lastId: number;
    url: string;
    private runid: number;
    private clients: { [id: string]: Client };
    private svr: longPollingServer.LongPollingServer;
    sourceMapCache: { [loc: string]: sourceMap.SourceMap };

    getSource: (loc: string) => Buffer;
    onChange: () => void;
    notifySomeChange: () => void;

    constructor() {
        this.getSource = () => null;
        this.lastId = 0;
        this.runid = 0;
        this.notifySomeChange = debounce(() => {
            if (this.onChange) this.onChange();
        }, 500);
        this.svr = new longPollingServer.LongPollingServer(c => this.newConnection(c));
        this.clients = Object.create(null);
        this.waitOneResolver = null;
        this.waitOneTimeOut = null;
        this.onChange = null;
    }

    deleteClientById(id: string) {
        delete this.clients[id];
    }
    
    handle(request: http.ServerRequest, response: http.ServerResponse) {
        this.svr.handle(request, response);
    }

    startTest(url: string) {
        this.sourceMapCache = Object.create(null);
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
        this.notifySomeChange();
    }

    private waitOneResolver: (result: TestResultsHolder) => void;
    private waitOneTimeOut: NodeJS.Timer;

    notifyTestingStarted() {
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

    getState(): TestSvrState {
        let kids = Object.keys(this.clients);
        let res: TestSvrState = {
            agents: []
        }
        for (let i = 0; i < kids.length; i++) {
            let c = this.clients[kids[i]];
            if (c.curResults || c.oldResults) {
                res.agents.push(c.curResults || c.oldResults);
            } else {
                res.agents.push({
                    duration: 0,
                    failure: false,
                    failures: [],
                    isSuite: true,
                    name: "",
                    nested: [],
                    running: false,
                    skipped: true,
                    logs: [],
                    testsFailed: 0,
                    testsFinished: 0,
                    testsSkipped: 0,
                    totalTests: 0,
                    userAgent: c.userAgent
                });
            }
        }
        return res;
    }
}
