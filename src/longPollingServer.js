"use strict";
var crypto = require('crypto');
function newRandomId() {
    return crypto.randomBytes(20).toString("base64");
}
var Connection = (function () {
    function Connection(owner) {
        this.owner = owner;
        this.id = newRandomId();
        this.closed = false;
        this.timeOut = null;
        this.toSend = [];
        this.reTimeout();
    }
    Connection.prototype.reTimeout = function () {
        if (this.timeOut !== null)
            clearTimeout(this.timeOut);
        this.timeOut = setTimeout(this.handleTimeOut, 5000, this);
    };
    Connection.prototype.handleTimeOut = function (that) {
        that.timeOut = null;
        if (that.response == null) {
            that.close();
        }
    };
    Connection.prototype.send = function (message, data) {
        this.toSend.push({ m: message, d: data });
        if (this.response != null && this.toSend.length === 1)
            setImmediate(this.sendResponse, this);
    };
    Connection.prototype.receivedMessage = function (message, data) {
        if (this.onMessage != null)
            this.onMessage(this, message, data);
    };
    Connection.prototype.close = function () {
        if (this.closed == false) {
            if (this.onClose != null)
                this.onClose(this);
        }
        this.closed = true;
        if (this.response != null) {
            this.response.end(JSON.stringify({ id: this.id, close: true }));
            this.response = null;
        }
    };
    Connection.prototype.sendResponse = function (that) {
        if (that.response != null) {
            that.pollResponse(that.response, false);
        }
    };
    Connection.prototype.pollResponse = function (response, waitAllowed) {
        if (this.closed) {
            response.end(JSON.stringify({ id: this.id, close: true }));
        }
        else if (this.toSend.length > 0) {
            response.end(JSON.stringify({ id: this.id, m: this.toSend }));
            this.toSend = [];
        }
        else if (waitAllowed) {
            if (this.response != null && this.response !== response) {
                this.response.end(JSON.stringify({ id: this.id, old: true }));
                this.response = null;
            }
            this.response = response;
            return;
        }
        else {
            response.end(JSON.stringify({ id: this.id }));
        }
        if (this.response === response) {
            this.response = null;
            this.reTimeout();
        }
    };
    return Connection;
}());
var LongPollingServer = (function () {
    function LongPollingServer(onConnect) {
        this.onConnect = onConnect;
        this.cs = Object.create(null);
    }
    LongPollingServer.prototype.handle = function (request, response) {
        if (request.method != 'POST') {
            response.writeHead(405, "Only POST allowed");
            response.end();
            return;
        }
        var jsonString = '';
        request.on('data', function (data) {
            if (jsonString.length + data.length > 1e6)
                request.connection.destroy();
            jsonString += data;
        });
        request.on('end', function () {
            var data;
            try {
                data = JSON.parse(jsonString);
            }
            catch (err) {
                response.writeHead(400, "JSON parse error " + err);
                response.end();
                return;
            }
            var c = null;
            if (data.id) {
                c = this.cs[data.id];
            }
            var waitAllowed = true;
            if (c == null) {
                c = new Connection(this);
                this.cs[c.id] = c;
                this.onConnect(c);
                waitAllowed = false;
            }
            if (data.close) {
                c.close();
                waitAllowed = false;
            }
            if (Array.isArray(data.m)) {
                waitAllowed = false;
                var ms = data.m;
                for (var i = 0; i < ms.length; i++) {
                    c.receivedMessage(ms[i].m, ms[i].d);
                }
            }
            c.pollResponse(response, waitAllowed);
        });
    };
    return LongPollingServer;
}());
exports.LongPollingServer = LongPollingServer;
