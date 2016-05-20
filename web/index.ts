import * as b from 'bobril';
import * as longPollingClient from './longPollingClient';
import * as testReportAnalyzer from './testReportAnalyzer';
import * as styles from './styles';

let c = new longPollingClient.Connection('/bb/api/main');

export interface StackFrame {
    functionName?: string;
    args?: any[];
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
}

export interface SuiteOrTest {
    isSuite: boolean;
    id: number;
    parentId: number;
    name: string;
    skipped: boolean;
    failure: boolean;
    duration: number;
    failures: { message: string, stack: StackFrame[] }[];
    nested: SuiteOrTest[];
    logs: { message: string, stack: StackFrame[] }[];
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

let connected = false;
let disconnected = false;
let testSvrState: TestSvrState = { agents: [] };
let reconnectDelay = 0;

function reconnect() {
    disconnected = false;
    c.connect();
    b.invalidate();
}

c.onClose = () => {
    connected = false;
    disconnected = true;
    b.invalidate();
    if (reconnectDelay < 30000) reconnectDelay += 1000;
    setTimeout(() => {
        reconnect();
    }, reconnectDelay);
};

c.onMessage = (c: longPollingClient.Connection, message: string, data: any) => {
    if (!connected) {
        connected = true;
        b.invalidate();
    }
    switch (message) {
        case "testUpdated": {
            testSvrState = data;
            b.invalidate();
            break;
        }
        default: {
            console.log("Unknown message: " + message, data);
            break;
        }
    }
};

function clickable(content: b.IBobrilChildren, action:()=>void):b.IBobrilNode {
    return { children:content, component: {
        onClick() { action(); return true; }
    }};
}

function getAgentsShort(selectedAgent: number, setSelectedAgent: (index: number) => void): b.IBobrilChildren {
    return testSvrState.agents.map((r, index) => {
        return clickable(b.styledDiv([
            b.styledDiv(r.userAgent, styles.spanUserAgent),
            b.styledDiv("Failures: " + r.testsFailed
                + ((r.testsSkipped > 0) ? (" Skipped: " + r.testsSkipped) : "")
                + " Successful: " + (r.testsFinished - r.testsFailed - r.testsSkipped), styles.spanInfo),
            r.running && b.styledDiv("Running " + r.testsFinished + "/" + r.totalTests, styles.spanInfo)
        ], index === selectedAgent&&styles.selectedStyle),() => { setSelectedAgent(index) });
    });
}

function stackFrameToString(sf: StackFrame) {
    var functionName = sf.functionName || '{anonymous}';
    var args = '(' + (sf.args || []).join(',') + ')';
    var fileName = sf.fileName ? ('@' + sf.fileName) : '';
    var lineNumber = sf.lineNumber != null ? (':' + sf.lineNumber) : '';
    var columnNumber = sf.columnNumber != null ? (':' + sf.columnNumber) : '';
    return functionName + args + fileName + lineNumber + columnNumber;
}

function getMessagesDetails(failures: { message: string, stack: StackFrame[] }[]): b.IBobrilChildren {
    return failures.map(f => [
        b.styledDiv(f.message),
        b.styledDiv(f.stack.map(sf => stackFrameToString(sf)).join("\n"), styles.stackStyle)
    ]);
}

function getTestDetail(a: SuiteOrTest): b.IBobrilChildren {
    let isFailed = a.failures && a.failures.length > 0;
    let hasLogs = a.logs && a.logs.length > 0;
    let isSuccessful = !isFailed && !hasLogs && !a.skipped;
    return [
        b.styledDiv(a.name, styles.suiteDivStyle, 
            isFailed && styles.failedStyle, 
            a.skipped && styles.skippedStyle, 
            isSuccessful && styles.successfulStyle
        ),
        isFailed && b.styledDiv(getMessagesDetails(a.failures), styles.suiteChildrenIndentStyle),
        hasLogs && b.styledDiv(getMessagesDetails(a.logs), styles.suiteChildrenIndentStyle)
    ];
}

function getSuiteDetail(a: SuiteOrTest): b.IBobrilChildren {
    return [
        b.styledDiv(a.name, styles.suiteDivStyle),
        b.styledDiv(getSuitesDetail(a.nested), styles.suiteChildrenIndentStyle)
    ];
}

function getSuitesDetail(a: SuiteOrTest[]): b.IBobrilChildren {
    return a.map(v => v.isSuite ? getSuiteDetail(v) : getTestDetail(v));
}

function getSuites(a: SuiteOrTest[], title: string): b.IBobrilChildren {
    return a.length > 0 && [
        { tag: "h3", children: title },
        getSuitesDetail(a)
    ]
}

function getAgentDetail(agent: TestResultsHolder): b.IBobrilChildren {
    let results = testReportAnalyzer.analyze(agent.nested);
    let suites = [
        getSuites(results.failed, "Failed"),
        getSuites(results.logged, "Logged")
    ];
    let skippedSuites = getSuites(results.skipped, "Skipped");
    let passedSuites = getSuites(results.passed, "Successful");
    if (results.skipped.length > results.passed.length) {
        suites.push(passedSuites);
        suites.push(skippedSuites);
    } else {
        suites.push(skippedSuites);
        suites.push(passedSuites);
    }
    return [ { tag: "h2", children: agent.userAgent + " details" }, suites ];
}

reconnect();

let selectedAgent = -1;
b.init(() => {
    if (selectedAgent >= testSvrState.agents.length) {
        selectedAgent = -1;
    }
    if (selectedAgent === -1 && testSvrState.agents.length > 0) { 
        selectedAgent = 0; 
    }
    return [
        { tag: "h1", children: "Bobril-build" },
        b.styledDiv(disconnected ? "Disconnected" : connected ? "Connected" : "Connecting"),
        getAgentsShort(selectedAgent, i => { selectedAgent = i; b.invalidate() }),
        selectedAgent >= 0 && getAgentDetail(testSvrState.agents[selectedAgent])
    ];
});
