"use strict";
var longPollingServer = require('./longPollingServer');
var debounce_1 = require('./debounce');
var stackTrace = require('./stackTrace');
var xmlWriter = require('./xmlWriter');
var uaparse = require('useragent').parse;
function toJUnitXml(results) {
    var w = new xmlWriter.XmlWritter(true);
    w.writeHeader();
    w.beginElement("testsuites");
    w.addAttribute("errors", "0");
    w.addAttribute("failures", "" + results.testsFailed);
    w.addAttribute("tests", "" + results.totalTests);
    w.addAttribute("time", (results.duration * 0.001).toFixed(4));
    results.nested.forEach(function (suite) {
        w.beginElement("testsuite");
        w.addAttribute("name", suite.name);
        w.addAttribute("time", (suite.duration * 0.001).toFixed(4));
        suite.nested.forEach(function (test) {
            w.beginElement("testcase");
            w.addAttribute("name", test.name);
            w.addAttribute("time", (test.duration * 0.001).toFixed(4));
            if (test.skipped) {
                w.beginElement("skipped");
                w.endElement();
            }
            else if (test.failure) {
                test.failures.forEach(function (fail) {
                    w.beginElement("failure");
                    w.addAttribute("message", fail.message + "\n" + fail.stack.join("\n"));
                    w.endElement();
                });
            }
            w.endElement();
        });
        w.endElement();
    });
    w.endElement();
    return w.getBuffer();
}
exports.toJUnitXml = toJUnitXml;
var Client = (function () {
    function Client(owner, id, connection) {
        var _this = this;
        this.server = owner;
        this.id = id;
        this.connection = connection;
        this.idle = true;
        this.oldResults = null;
        this.curResults = null;
        connection.onClose = function () {
            delete _this.server.clients[_this.id];
            _this.server.notifySomeChange();
        };
        connection.onMessage = function (connection, message, data) {
            // console.log("Test Message " + message);
            switch (message) {
                case 'newClient': {
                    _this.userAgent = uaparse(connection.userAgent, data.userAgent).toString();
                    if (_this.url)
                        _this.doStart();
                    else {
                        _this.connection.send("wait", null);
                    }
                    _this.server.notifySomeChange();
                    break;
                }
                case 'wholeStart': {
                    if (_this.curResults == null)
                        break;
                    _this.curResults.totalTests = data;
                    _this.suiteStack = [_this.curResults];
                    _this.server.notifyTestingStarted(_this);
                    _this.server.notifySomeChange();
                    break;
                }
                case 'wholeDone': {
                    if (_this.curResults == null)
                        break;
                    if (_this.suiteStack == null)
                        break;
                    _this.curResults.duration = data;
                    _this.curResults.running = false;
                    _this.oldResults = _this.curResults;
                    _this.curResults = null;
                    _this.suiteStack = null;
                    _this.server.notifyFinishedResults(_this.oldResults);
                    _this.server.notifySomeChange();
                    break;
                }
                case 'suiteStart': {
                    if (_this.curResults == null)
                        break;
                    if (_this.suiteStack == null)
                        break;
                    var suite = {
                        name: data,
                        nested: [],
                        duration: 0,
                        failure: false,
                        isSuite: true,
                        failures: [],
                        skipped: false,
                        logs: []
                    };
                    _this.suiteStack[_this.suiteStack.length - 1].nested.push(suite);
                    _this.suiteStack.push(suite);
                    _this.server.notifySomeChange();
                    break;
                }
                case 'suiteDone': {
                    if (_this.curResults == null)
                        break;
                    if (_this.suiteStack == null)
                        break;
                    var suite = _this.suiteStack.pop();
                    suite.duration = data.duration;
                    if (data.failures.length > 0)
                        (_a = suite.failures).push.apply(_a, _this.convertFailures(data.failures));
                    if (suite.failures.length > 0) {
                        suite.failure = true;
                        for (var i = 0; i < _this.suiteStack.length; i++) {
                            _this.suiteStack[i].failure = true;
                        }
                    }
                    _this.server.notifySomeChange();
                    break;
                }
                case 'testStart': {
                    if (_this.curResults == null)
                        break;
                    if (_this.suiteStack == null)
                        break;
                    var test = {
                        name: data,
                        nested: null,
                        duration: 0,
                        failure: false,
                        isSuite: false,
                        failures: [],
                        skipped: false,
                        logs: []
                    };
                    _this.suiteStack[_this.suiteStack.length - 1].nested.push(test);
                    _this.suiteStack.push(test);
                    _this.server.notifySomeChange();
                    break;
                }
                case 'testDone': {
                    if (_this.curResults == null)
                        break;
                    if (_this.suiteStack == null)
                        break;
                    var test = _this.suiteStack.pop();
                    test.duration = data.duration;
                    if (data.failures.length > 0)
                        (_b = test.failures).push.apply(_b, _this.convertFailures(data.failures));
                    _this.curResults.testsFinished++;
                    if (data.status === 'passed') {
                    }
                    else if (data.status === 'skipped') {
                        _this.curResults.testsSkipped++;
                        test.skipped = true;
                    }
                    else {
                        _this.curResults.testsFailed++;
                        test.failure = true;
                        for (var i = 0; i < _this.suiteStack.length; i++) {
                            _this.suiteStack[i].failure = true;
                        }
                    }
                    _this.server.notifySomeChange();
                    break;
                }
                case 'consoleLog': {
                    if (_this.curResults == null)
                        break;
                    if (_this.suiteStack == null)
                        break;
                    var test = _this.suiteStack[_this.suiteStack.length - 1];
                    test.logs.push(_this.convertMessageAndStack(data));
                    _this.server.notifySomeChange();
                    break;
                }
            }
            var _a, _b;
        };
    }
    Client.prototype.startTest = function (url, runid) {
        this.url = url;
        this.runid = runid;
        this.doStart();
    };
    Client.prototype.initCurResults = function () {
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
    };
    Client.prototype.doStart = function () {
        this.idle = false;
        this.initCurResults();
        this.connection.send("test", { url: this.url });
    };
    Client.prototype.convertMessageAndStack = function (rawMessage) {
        var st = stackTrace.parseStack(rawMessage.stack);
        st = stackTrace.enhanceStack(st, this.server.getSource, this.server.sourceMapCache);
        st = st.filter(function (fr) { return !/^http\:\/\//g.test(fr.fileName); });
        return { message: rawMessage.message, stack: st };
    };
    Client.prototype.convertFailures = function (rawFailures) {
        var _this = this;
        return rawFailures.map(function (rf) { return _this.convertMessageAndStack(rf); });
    };
    return Client;
}());
var TestServer = (function () {
    function TestServer() {
        var _this = this;
        this.getSource = function () { return null; };
        this.lastId = 0;
        this.runid = 0;
        this.notifySomeChange = debounce_1.debounce(function () {
            if (_this.onChange)
                _this.onChange();
        }, 500);
        this.svr = new longPollingServer.LongPollingServer(function (c) { return _this.newConnection(c); });
        this.clients = Object.create(null);
        this.waitOneResolver = null;
        this.waitOneTimeOut = null;
        this.onChange = null;
    }
    TestServer.prototype.handle = function (request, response) {
        this.svr.handle(request, response);
    };
    TestServer.prototype.startTest = function (url) {
        this.sourceMapCache = Object.create(null);
        this.runid++;
        this.url = url;
        var ids = Object.keys(this.clients);
        for (var i = 0; i < ids.length; i++) {
            this.clients[ids[i]].startTest(this.url, this.runid);
        }
    };
    TestServer.prototype.newConnection = function (c) {
        var id = "" + this.lastId++;
        var cl = new Client(this, id, c);
        this.clients[id] = cl;
        if (this.url)
            cl.startTest(this.url, this.runid);
        this.notifySomeChange();
    };
    TestServer.prototype.notifyTestingStarted = function (client) {
        if (this.waitOneTimeOut != null) {
            clearTimeout(this.waitOneTimeOut);
            this.waitOneTimeOut = null;
        }
    };
    TestServer.prototype.notifyFinishedResults = function (result) {
        if (this.waitOneResolver) {
            this.waitOneResolver(result);
            this.waitOneResolver = null;
        }
    };
    TestServer.prototype.waitForOneResult = function () {
        var _this = this;
        this.waitOneTimeOut = setTimeout(function () {
            _this.waitOneTimeOut = null;
            _this.waitOneResolver(null);
            _this.waitOneResolver = null;
        }, 10000);
        return new Promise(function (resolve, reject) {
            _this.waitOneResolver = resolve;
        });
    };
    TestServer.prototype.getState = function () {
        var kids = Object.keys(this.clients);
        var res = {
            agents: []
        };
        for (var i = 0; i < kids.length; i++) {
            var c = this.clients[kids[i]];
            if (c.curResults || c.oldResults) {
                res.agents.push(c.curResults || c.oldResults);
            }
            else {
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
    };
    return TestServer;
}());
exports.TestServer = TestServer;
