declare var jasmineRequire: any;

(function() {
    var jasmine = jasmineRequire.core(jasmineRequire);
    window['jasmine'] = jasmine;

    var env = jasmine.getEnv();

    var jasmineInterface = jasmineRequire.interface(jasmine, env);
    for (var property in jasmineInterface) window[property] = jasmineInterface[property];

    env.throwOnExpectationFailure(true);

    env.specFilter = function(spec) {
        //console.log("Filter "+spec.getFullName());
        return true;
    };

    var bbTest = (<any>window.parent).bbTest;
    if (bbTest) {
        env.catchExceptions(true);
        let perfnow: () => number = null;
        if (window.performance) {
            let p = <any>window.performance;
            perfnow = p.now || p.webkitNow || p.msNow || p.mozNow;
            if (perfnow) {
                let realnow = perfnow;
                perfnow = () => realnow.call(p);
            }
        }
        if (!perfnow) {
            if (Date.now) {
                perfnow = Date.now;
            } else {
                perfnow = (() => +(new Date()));
            }
        }
        let stack = [];
        let specStart = 0;
        let totalStart = 0;
        env.addReporter({
            jasmineStarted: (suiteInfo: { totalSpecsDefined: number }) => {
                bbTest("wholeStart", suiteInfo.totalSpecsDefined);
                totalStart = perfnow();
            },
            jasmineDone: () => {
                bbTest("wholeDone", perfnow() - totalStart);
            },
            suiteStarted: (result: { description: string, fullName: string }) => {
                bbTest("suiteStart", result.description);
                stack.push(perfnow());
            },
            specStarted: (result: { description: string, fullName: string }) => {
                bbTest("testStart", result.description);
                specStart = perfnow();
            },
            specDone: (result: { description: string, status: string, failedExpectations: { message: string, stack: string }[] }) => {
                let duration = perfnow() - specStart;
                bbTest("testDone", { name: result.description, duration, status: result.status, failures: result.failedExpectations });
            },
            suiteDone: (result: { description: string, status: string, failedExpectations: { message: string, stack: string }[] }) => {
                let duration = perfnow() - stack.pop();
                bbTest("suiteDone", { name: result.description, duration, status: result.status, failures: result.failedExpectations });
            }
        });
    } else {
        env.catchExceptions(false);

        env.addReporter({
            jasmineStarted: (suiteInfo: { totalSpecsDefined: number }) => {
                console.log("Started " + suiteInfo.totalSpecsDefined);
            },
            jasmineDone: () => {
                console.log("Done");
            },
            suiteStarted: (result: { decription: string, fullName: string }) => {
                console.log("Suite " + result.fullName);
            },
            specStarted: (result: { decription: string, fullName: string }) => {
                console.log("Spec " + result.fullName);
            },
            specDone: (result: { description: string, status: string, failedExpectations: { message: string, stack: any }[] }) => {
                console.log("Spec finished " + result.status);
            },
            suiteDone: (result: { description: string, status: string, failedExpectations: { message: string, stack: any }[] }) => {
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

    window.onload = function() {
        env.execute();
    };
} ());
