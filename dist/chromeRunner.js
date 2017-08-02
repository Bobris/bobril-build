"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chromeRunner = require("chrome-runner");
function launchChrome(url) {
    let resolveFinish;
    let rejectFinish;
    let launchedChrome;
    let res = {
        finish: new Promise((resolve, reject) => {
            resolveFinish = resolve;
            rejectFinish = reject;
        }),
        kill() {
            if (launchedChrome)
                launchedChrome.kill();
        }
    };
    chromeRunner.launchWithHeadless({
        startupPage: url
    }).then(chrome => {
        launchedChrome = chrome;
        chrome.chromeProcess.on("close", (code) => {
            resolveFinish(code);
        });
    }).catch(rejectFinish);
    return res;
}
exports.launchChrome = launchChrome;
//# sourceMappingURL=chromeRunner.js.map