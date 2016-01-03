"use strict";
var longPollingServer = require('./longPollingServer');
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
            delete _this.server[_this.id];
        };
        connection.onMessage = function (connection, message, data) {
            console.log("Message " + message, data);
            switch (message) {
                case 'newClient': {
                    _this.userAgent = connection.userAgent;
                    _this.jsUserAgent = data.userAgent;
                    if (_this.url)
                        _this.doStart();
                    else {
                        _this.connection.send("wait", null);
                    }
                    break;
                }
                case 'wholeStart': {
                    _this.curResults.totalTests = data;
                    _this.suiteStack = [_this.curResults];
                    _this.server.notifyTestingStarted(_this);
                    break;
                }
                case 'wholeDone': {
                    _this.curResults.running = false;
                    _this.oldResults = _this.curResults;
                    _this.curResults = null;
                    _this.suiteStack = null;
                    _this.server.notifyFinishedResults(_this.oldResults);
                    break;
                }
                case 'suiteStart': {
                    var suite = {
                        name: data,
                        nested: [],
                        failure: false,
                        isSuite: true,
                        failures: [],
                        skipped: false
                    };
                    _this.suiteStack[_this.suiteStack.length - 1].nested.push(suite);
                    _this.suiteStack.push(suite);
                    break;
                }
                case 'suiteDone': {
                    var suite = _this.suiteStack.pop();
                    if (data.failures.length > 0)
                        (_a = suite.failures).push.apply(_a, data.failures);
                    if (suite.failures.length > 0) {
                        suite.failure = true;
                        for (var i = 0; i < _this.suiteStack.length; i++) {
                            _this.suiteStack[i].failure = true;
                        }
                    }
                    break;
                }
                case 'testStart': {
                    var suite = {
                        name: data,
                        nested: null,
                        failure: false,
                        isSuite: false,
                        failures: [],
                        skipped: false
                    };
                    _this.suiteStack[_this.suiteStack.length - 1].nested.push(suite);
                    _this.suiteStack.push(suite);
                    break;
                }
                case 'testDone': {
                    var test = _this.suiteStack.pop();
                    if (data.failures.length > 0)
                        (_b = test.failures).push.apply(_b, data.failures);
                    _this.curResults.testsFinished++;
                    if (data.status === 'passed') {
                    }
                    else if (data.status === 'skipped') {
                        _this.curResults.testsSkipped++;
                        test.skipped = true;
                    }
                    else {
                        test.failure = true;
                        for (var i = 0; i < _this.suiteStack.length; i++) {
                            _this.suiteStack[i].failure = true;
                        }
                    }
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
    Client.prototype.doStart = function () {
        this.idle = false;
        this.curResults = {
            userAgent: this.userAgent,
            jsUserAgent: this.jsUserAgent,
            nested: [],
            running: true,
            totalTests: null,
            testsFinished: 0,
            testsFailed: 0,
            testsSkipped: 0,
            name: "",
            failure: false,
            skipped: false,
            failures: [],
            isSuite: true
        };
        this.connection.send("test", { url: this.url });
    };
    return Client;
}());
var TestServer = (function () {
    function TestServer() {
        var _this = this;
        this.lastId = 0;
        this.runid = 0;
        this.svr = new longPollingServer.LongPollingServer(function (c) { return _this.newConnection(c); });
        this.clients = Object.create(null);
        this.waitOneResolver = null;
        this.waitOneTimeOut = null;
    }
    TestServer.prototype.handle = function (request, response) {
        this.svr.handle(request, response);
    };
    TestServer.prototype.startTest = function (url) {
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
    return TestServer;
}());
exports.TestServer = TestServer;
