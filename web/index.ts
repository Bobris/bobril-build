import * as b from 'bobril';
import * as testReportAnalyzer from './testReportAnalyzer';
import * as styles from './styles';
import * as s from './state';
import * as com from './communication';

function clickable(content: b.IBobrilChildren, action: () => void): b.IBobrilNode {
    return {
        children: content, component: {
            onClick() { action(); return true; }
        }
    };
}

function getAgentsShort(selectedAgent: number, setSelectedAgent: (index: number) => void): b.IBobrilChildren {
    return s.testSvrState.agents.map((r, index) => {
        return clickable(b.styledDiv([
            b.styledDiv(r.userAgent, styles.spanUserAgent),
            b.styledDiv("Failures: " + r.testsFailed
                + ((r.testsSkipped > 0) ? (" Skipped: " + r.testsSkipped) : "")
                + " Successful: " + (r.testsFinished - r.testsFailed - r.testsSkipped), styles.spanInfo),
            r.running && b.styledDiv("Running " + r.testsFinished + "/" + r.totalTests, styles.spanInfo)
        ], index === selectedAgent && styles.selectedStyle), () => { setSelectedAgent(index) });
    });
}

function stackFrameToString(sf: s.StackFrame) {
    var functionName = sf.functionName || '{anonymous}';
    var args = '(' + (sf.args || []).join(',') + ')';
    var fileName = sf.fileName ? ('@' + sf.fileName) : '';
    var lineNumber = sf.lineNumber != null ? (':' + sf.lineNumber) : '';
    var columnNumber = sf.columnNumber != null ? (':' + sf.columnNumber) : '';
    return functionName + args + fileName + lineNumber + columnNumber;
}

function getMessagesDetails(failures: { message: string, stack: s.StackFrame[] }[]): b.IBobrilChildren {
    return failures.map(f => [
        b.styledDiv(f.message),
        b.styledDiv(f.stack.map(sf => stackFrameToString(sf)).join("\n"), styles.stackStyle)
    ]);
}

function getTestDetail(a: s.SuiteOrTest): b.IBobrilChildren {
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

function getSuiteDetail(a: s.SuiteOrTest): b.IBobrilChildren {
    return [
        b.styledDiv(a.name, styles.suiteDivStyle),
        b.styledDiv(getSuitesDetail(a.nested), styles.suiteChildrenIndentStyle)
    ];
}

function getSuitesDetail(a: s.SuiteOrTest[]): b.IBobrilChildren {
    return a.map(v => v.isSuite ? getSuiteDetail(v) : getTestDetail(v));
}

function getSuites(a: s.SuiteOrTest[], title: string): b.IBobrilChildren {
    return a.length > 0 && [
        { tag: "h3", children: title },
        getSuitesDetail(a)
    ]
}

function getAgentDetail(agent: s.TestResultsHolder): b.IBobrilChildren {
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
    return [{ tag: "h2", children: agent.userAgent + " details" }, suites];
}

function getBuildStatus() {
    const l = s.lastBuildResult;
    return b.styledDiv([
        s.building && b.styledDiv("Build in progress"),
        b.styledDiv("Last Build Result Errors: " + l.errors + " Warnings: " + l.warnings + " Duration: " + l.time + "ms"),
        l.messages.map(m => b.styledDiv(
            [
                b.styledDiv((m.isError ? "Error: " : "Warning: ") + m.text, m.isError ? styles.errorMessage : styles.warningMessage),
                b.styledDiv(`${m.fileName} (${m.pos[0]}:${m.pos[1]}-${m.pos[2]}:${m.pos[3]})`, styles.filePos)
            ]
        ))
    ]);
}

com.reconnect();

let selectedAgent = -1;
b.init(() => {
    if (selectedAgent >= s.testSvrState.agents.length) {
        selectedAgent = -1;
    }
    if (selectedAgent === -1 && s.testSvrState.agents.length > 0) {
        selectedAgent = 0;
    }
    return [
        { tag: "h2", children: "Bobril-build" },
        b.styledDiv(s.disconnected ? "Disconnected" : s.connected ? "Connected" : "Connecting"),
        getBuildStatus(),
        getAgentsShort(selectedAgent, i => { selectedAgent = i; b.invalidate() }),
        selectedAgent >= 0 && getAgentDetail(s.testSvrState.agents[selectedAgent])
    ];
});
