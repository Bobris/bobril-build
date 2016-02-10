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
        var perfnow_1 = null;
        if (window.performance) {
            var p_1 = window.performance;
            perfnow_1 = p_1.now || p_1.webkitNow || p_1.msNow || p_1.mozNow;
            if (perfnow_1) {
                var realnow_1 = perfnow_1;
                perfnow_1 = function () { return realnow_1.call(p_1); };
            }
        }
        if (!perfnow_1) {
            if (Date.now) {
                perfnow_1 = Date.now;
            }
            else {
                perfnow_1 = (function () { return +(new Date()); });
            }
        }
        var stack_1 = [];
        var specStart_1 = 0;
        var totalStart_1 = 0;
        env.addReporter({
            jasmineStarted: function (suiteInfo) {
                bbTest("wholeStart", suiteInfo.totalSpecsDefined);
                totalStart_1 = perfnow_1();
            },
            jasmineDone: function () {
                bbTest("wholeDone", perfnow_1() - totalStart_1);
            },
            suiteStarted: function (result) {
                bbTest("suiteStart", result.description);
                stack_1.push(perfnow_1());
            },
            specStarted: function (result) {
                bbTest("testStart", result.description);
                specStart_1 = perfnow_1();
            },
            specDone: function (result) {
                var duration = perfnow_1() - specStart_1;
                bbTest("testDone", { name: result.description, duration: duration, status: result.status, failures: result.failedExpectations });
            },
            suiteDone: function (result) {
                var duration = perfnow_1() - stack_1.pop();
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
