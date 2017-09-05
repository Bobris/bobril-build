import * as chromeRunner from 'chrome-runner';

export interface IChromeProcess {
    finish: Promise<number>;
    kill(): void;
}

export function launchChrome(url): [Promise<void>, IChromeProcess] {
    let resolveFinish: (code: number) => void;
    let rejectFinish: (err: Error) => void;
    let launchedChrome: any;
    let res: IChromeProcess = {
        finish: new Promise<number>((resolve, reject) => {
            resolveFinish = resolve;
            rejectFinish = reject;
        }),
        kill() {
            if (launchedChrome)
                launchedChrome.kill();
        }
    };

    return [chromeRunner.launchWithHeadless({
        startupPage: url
    }).then(chrome => {
        launchedChrome = chrome;
        chrome.chromeProcess.on("close", (code: number) => {
            resolveFinish(code);
        });
    }).catch(rejectFinish), res];
}