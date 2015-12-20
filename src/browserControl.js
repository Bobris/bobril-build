"use strict";
var web = require('browser_process');
var rdbg = require('rdbg');
var temp = require('temp');
var net = require('net');
require('bluebird');
var BrowserControl = (function () {
    function BrowserControl() {
        var _this = this;
        var that = this;
        this._scripts = [];
        this._client = rdbg.createClient();
        this._client.on('close', function () {
            console.log('debugger disconnected');
        });
        this._client.on('connect', function () {
            _this._client.debugger.on('clear', function () {
                that._scripts = [];
            });
            _this._client.debugger.on('scriptParse', function (script) {
                if (script.url != "") {
                    that._scripts.push(script);
                }
            });
            _this._client.debugger.enable(function () {
                console.log('debugger enabled');
            });
        });
        //this._client.on('ready', () => {
        //	console.log('ready');
        //});
    }
    BrowserControl.prototype.start = function (port, command, url) {
        var that = this;
        return new Promise(function (resolve, reject) {
            var options = {};
            var args = [];
            args.unshift('--no-first-run', '--no-default-browser-check');
            var dirname = temp.path(command);
            args.unshift.apply(args, web.options(command, {
                profile: dirname,
                url: url,
                debug: port,
            }));
            console.log("spawn", command, args.join(' '));
            web.spawn(command, args, options, function (error, browser) {
                if (error) {
                    console.log('bail', error.description);
                    reject(error);
                    return;
                }
                console.log('find %s', url);
                setTimeout(function find(retry) {
                    rdbg.get(port, 'localhost', function (error, targets) {
                        if (error) {
                            targets = [];
                        }
                        var matches = targets.filter(function (target) {
                            return url === target.url.substr(0, url.length);
                        });
                        if (matches.length > 0) {
                            console.log('start connect');
                            that._target = matches[0];
                            that._client.connect(that._target);
                            resolve();
                            return;
                        }
                        else if (retry) {
                            setTimeout(find, 1000, retry--);
                            return;
                        }
                        if (error === undefined) {
                            error = new Error('Cannot find browser tab \'' + url + '\'');
                        }
                        console.log('find error', error);
                        reject(error);
                    });
                }, 1000, 120);
            });
        });
    };
    BrowserControl.prototype.getScriptIdFromUrl = function (url) {
        return this._scripts.find(function (i) { return i.url === url; }).scriptId;
    };
    BrowserControl.prototype.listScriptUrls = function () {
        return this._scripts.map(function (i) { return i.url; });
    };
    BrowserControl.prototype.setScriptSource = function (scriptId, content) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._client.debugger.setScriptSource(scriptId, content, function (err) {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    };
    BrowserControl.prototype.evaluate = function (script) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._client.runtime.evaluate(script, function (err) {
                if (err)
                    reject(err);
                resolve();
            });
        });
    };
    return BrowserControl;
}());
exports.BrowserControl = BrowserControl;
