"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = require("child_process");
function startPhantomJs(args) {
    let resolveFinish;
    let rejectFinish;
    let phantomjs;
    var res = {
        finish: new Promise((resolve, reject) => {
            resolveFinish = resolve;
            rejectFinish = reject;
        }),
        kill() {
            phantomjs.kill();
        }
    };
    const phantomPath = require('phantomjs-prebuilt').path;
    if (phantomPath == null) {
        rejectFinish(new Error("PhantomJs path is null"));
    }
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
        phantomjs.on('error', (e) => {
            rejectFinish(e);
        });
    }
    catch (e) {
        rejectFinish(e);
    }
    return res;
}
exports.startPhantomJs = startPhantomJs;
//# sourceMappingURL=phantomjsRunner.js.map