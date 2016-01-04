"use strict";
var longPollingServer = require('./longPollingServer');
var Client = (function () {
    function Client(owner, id, connection) {
        var _this = this;
        this.server = owner;
        this.id = id;
        this.connection = connection;
        connection.onClose = function () {
            delete _this.server[_this.id];
        };
        connection.onMessage = function (connection, message, data) {
            console.log("Main Message " + message, data);
            switch (message) {
            }
        };
    }
    return Client;
}());
var MainServer = (function () {
    function MainServer(testSvr) {
        var _this = this;
        this.lastId = 0;
        this.testSvr = testSvr;
        this.clients = Object.create(null);
        testSvr.onChange = function () { _this.notifyTestSvrChange(); };
        this.svr = new longPollingServer.LongPollingServer(function (c) { return _this.newConnection(c); });
    }
    MainServer.prototype.handle = function (request, response) {
        this.svr.handle(request, response);
    };
    MainServer.prototype.newConnection = function (c) {
        var id = "" + this.lastId++;
        var cl = new Client(this, id, c);
        this.clients[id] = cl;
        var testState = this.testSvr.getState();
        cl.connection.send("testUpdated", testState);
    };
    MainServer.prototype.notifyTestSvrChange = function () {
        var kids = Object.keys(this.clients);
        if (kids.length == 0)
            return;
        var testState = this.testSvr.getState();
        for (var i = 0; i < kids.length; i++) {
            this.clients[kids[i]].connection.send("testUpdated", testState);
        }
    };
    return MainServer;
}());
exports.MainServer = MainServer;
