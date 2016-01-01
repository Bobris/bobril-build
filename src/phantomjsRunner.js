"use strict";
var child_process = require('child_process');
function startPhantomJs(args) {
    var resolveFinish;
    var rejectFinish;
    var phantomjs;
    var res = {
        finish: new Promise(function (resolve, reject) {
            resolveFinish = resolve;
            rejectFinish = reject;
        }),
        kill: function () {
            phantomjs.kill();
        }
    };
    var phantomPath = require('phantomjs').path;
    try {
        phantomjs = child_process.spawn(phantomPath, args);
        phantomjs.stdout.pipe(process.stdout);
        phantomjs.stderr.pipe(process.stderr);
        phantomjs.on('exit', function (code) {
            if (code == null) {
                rejectFinish(new Error("Finished without exit code"));
            }
            else {
                resolveFinish(code);
            }
        });
        phantomjs.on('error', function (e) {
            rejectFinish(e);
        });
    }
    catch (e) {
        rejectFinish(e);
    }
    return res;
}
exports.startPhantomJs = startPhantomJs;
