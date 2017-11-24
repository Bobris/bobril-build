"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chromeLauncher = require("chrome-launcher");
function launchChrome(url) {
    let resolveFinish;
    let rejectFinish;
    let launchedChrome;
    let res = {
        // crash/finish notification does not work with chrome-launcher
        finish: new Promise((resolve, reject) => {
            resolveFinish = resolve;
            rejectFinish = reject;
        }),
        kill() {
            if (launchedChrome)
                launchedChrome.kill();
        }
    };
    return [
        chromeLauncher
            .launch({
            startingUrl: url,
            chromeFlags: ["--headless", "--disable-gpu"]
        })
            .then(chrome => {
            launchedChrome = chrome;
        })
            .catch(rejectFinish),
        res
    ];
}
exports.launchChrome = launchChrome;
//# sourceMappingURL=chromeRunner.js.map