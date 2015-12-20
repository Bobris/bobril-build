"use strict";
var chokidar = require('chokidar');
var debounce = require('./debounce');
function watch(param) {
    chokidar.watch(param.paths, { ignored: /[\/\\]\./, ignoreInitial: true }).once('ready', function () {
        process.send({ command: "watchReady" });
    }).on('all', debounce.debounce(function (v, v2) {
        process.send({ command: "watchChange" });
    }));
}
exports.watch = watch;
