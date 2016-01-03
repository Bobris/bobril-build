(function () {
    var jasmine = jasmineRequire.core(jasmineRequire);
    window['jasmine'] = jasmine;
    var env = jasmine.getEnv();
    var jasmineInterface = jasmineRequire.interface(jasmine, env);
    for (var property in jasmineInterface)
        window[property] = jasmineInterface[property];
    env.throwOnExpectationFailure(true);
    env.specFilter = function (spec) {
        //console.log("Filter "+spec.getFullName());
        return true;
    };
    var bbTest = window.parent.bbTest;
    if (bbTest) {
        env.catchExceptions(true);
        var perfnow = null;
        if (window.performance) {
            var p = performance;
            perfnow = p.now || p.webkitNow || p.msNow || p.mozNow;
        }
        if (!perfnow) {
            perfnow = Date.now || (function () { return +(new Date()); });
        }
        var stack = [];
        var specStart = 0;
        env.addReporter({
            jasmineStarted: function (suiteInfo) {
                bbTest("wholeStart", suiteInfo.totalSpecsDefined);
            },
            jasmineDone: function () {
                bbTest("wholeDone");
            },
            suiteStarted: function (result) {
                bbTest("suiteStart", result.description);
                stack.push(perfnow());
            },
            specStarted: function (result) {
                bbTest("testStart", result.description);
                specStart = perfnow();
            },
            specDone: function (result) {
                var duration = perfnow() - specStart;
                bbTest("testDone", { name: result.description, duration: duration, status: result.status, failures: result.failedExpectations });
            },
            suiteDone: function (result) {
                var duration = perfnow() - stack.pop();
                bbTest("suiteDone", { name: result.description, duration: duration, status: result.status, failures: result.failedExpectations });
            }
        });
    }
    else {
        env.catchExceptions(false);
        env.addReporter({
            jasmineStarted: function (suiteInfo) {
                console.log("Started " + suiteInfo.totalSpecsDefined);
            },
            jasmineDone: function () {
                console.log("Done");
            },
            suiteStarted: function (result) {
                console.log("Suite " + result.fullName);
            },
            specStarted: function (result) {
                console.log("Spec " + result.fullName);
            },
            specDone: function (result) {
                console.log("Spec finished " + result.status);
            },
            suiteDone: function (result) {
                console.log("Suite finished " + result.status);
            }
        });
    }
    /**
     * Setting up timing functions to be able to be overridden. Certain browsers (Safari, IE 8, phantomjs) require this hack.
     */
    window.setTimeout = window.setTimeout;
    window.setInterval = window.setInterval;
    window.clearTimeout = window.clearTimeout;
    window.clearInterval = window.clearInterval;
    window.onload = function () {
        env.execute();
    };
}());
