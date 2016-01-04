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

c.onClose = () => {
    disconnected = true;
    b.invalidate();
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
let spanInfo =b.styleDef({ display: "inline-block" });
function getAgentsShort(): b.IBobrilChildren {
    return testSvrState.agents.map(r=>{
       return b.styledDiv([
           b.styledDiv(r.userAgent,spanUserAgent),
           b.styledDiv("Failures: "+r.testsFailed+" Skipped: "+r.testsSkipped+" Successful: "+(r.testsFinished-r.testsFailed-r.testsSkipped), spanInfo),
           r.running && b.styledDiv(" Running "+r.testsFinished+"/"+r.totalTests,spanInfo)
       ]);
    });
}

b.init(() => [
    { tag: "h1", children: "Bobril-build" },
    b.styledDiv(disconnected ? "Disconnected reload to reconnect" : connected ? "Connected" : "Connecting"),
    getAgentsShort()
]);
