(function () {
    var jasmine = jasmineRequire.core(jasmineRequire);
    window['jasmine'] = jasmine;
    var env = jasmine.getEnv();
    var jasmineInterface = jasmineRequire.interface(jasmine, env);
    for (var property in jasmineInterface)
        window[property] = jasmineInterface[property];
    env.catchExceptions(true);
    env.throwOnExpectationFailure(true);
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
    env.specFilter = function (spec) {
        console.log("Filter " + spec.getFullName());
        return true;
    };
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
