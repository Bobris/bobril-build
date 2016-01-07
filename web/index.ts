import * as b from 'bobril';
import * as longPollingClient from './longPollingClient';

let c = new longPollingClient.Connection('/bb/api/main');

export interface SuiteOrTest {
    isSuite: boolean;
    name: string;
    skipped: boolean;
    failure: boolean;
    duration: number;
    failures: { message: string, stack: any }[];
    nested: SuiteOrTest[];
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

let spanUserAgent = b.styleDef({ display: "inline-block", width: "30%" });
let spanInfo = b.styleDef({ marginLeft: 10, display: "inline-block" });
function getAgentsShort(): b.IBobrilChildren {
    return testSvrState.agents.map(r => {
        return b.styledDiv([
            b.styledDiv(r.userAgent, spanUserAgent),
            b.styledDiv("Failures: " + r.testsFailed
                + ((r.testsSkipped > 0) ? (" Skipped: " + r.testsSkipped) : "")
                + " Successful: " + (r.testsFinished - r.testsFailed - r.testsSkipped), spanInfo),
            r.running && b.styledDiv("Running " + r.testsFinished + "/" + r.totalTests, spanInfo)
        ]);
    });
}

let suiteDivStyle = b.styleDef({
    fontSize: "20px"
});

let suiteChildrenIndentStyle = b.styleDef({
    marginLeft: 20
});

function getSuiteDetail(a: SuiteOrTest): b.IBobrilChildren {
    return [
        b.styledDiv(a.name, suiteDivStyle),
        b.styledDiv(getSuitesDetail(a.nested), suiteChildrenIndentStyle)
    ];
}

let stackStyle = b.styleDef({
    whiteSpace: "pre-wrap"
});

function getFailuresDetail(failures: { message: string, stack: any }[]): b.IBobrilChildren {
    return failures.map(f => [
        b.styledDiv(f.message),
        b.styledDiv(f.stack, stackStyle)
    ]);
}

function getTestDetail(a: SuiteOrTest): b.IBobrilChildren {
    return [
        b.styledDiv(a.name, suiteDivStyle),
        (a.failures && a.failures.length > 0) && b.styledDiv(getFailuresDetail(a.failures), suiteChildrenIndentStyle)
    ];
}

function getSuitesDetail(a: SuiteOrTest[]): b.IBobrilChildren {
    return a.map(v => v.isSuite ? getSuiteDetail(v) : getTestDetail(v));
}

function getAgentDetail(agent: TestResultsHolder): b.IBobrilChildren {
    return [
        { tag: "h2", children: agent.userAgent + " details" },
        getSuitesDetail(agent.nested)
    ];
}

reconnect();

b.init(() => [
    { tag: "h1", children: "Bobril-build" },
    b.styledDiv(disconnected ? "Disconnected" : connected ? "Connected" : "Connecting"),
    getAgentsShort(),
    testSvrState.agents.length > 0 && getAgentDetail(testSvrState.agents[0])
]);
