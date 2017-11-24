import * as chromeLauncher from "chrome-launcher";
import { LaunchedChrome } from "chrome-launcher";

export interface IChromeProcess {
    finish: Promise<number>;
    kill(): void;
}

export function launchChrome(url): [Promise<void>, IChromeProcess] {
    let resolveFinish: (code: number) => void;
    let rejectFinish: (err: Error) => void;
    let launchedChrome: LaunchedChrome;
    let res: IChromeProcess = {
        // crash/finish notification does not work with chrome-launcher
        finish: new Promise<number>((resolve, reject) => {
            resolveFinish = resolve;
            rejectFinish = reject;
        }),
        kill() {
            if (launchedChrome) launchedChrome.kill();
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
