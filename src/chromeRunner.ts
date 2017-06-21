import * as chromeLauncher from 'lighthouse/chrome-launcher/chrome-launcher';

export interface IChromeProcess {
    finish: Promise<number>;
    kill(): void;
}

export function launchChrome(url) {
    let resolveFinish: (code: number) => void;
    let rejectFinish: (err: Error) => void;
    let launchedChrome: chromeLauncher.LaunchedChrome;
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

    chromeLauncher.launch({
        chromeFlags: [
            '--disable-gpu',
            '--headless'
        ],
        startingUrl: url
    }).then(chrome => {
        launchedChrome = chrome;
        resolveFinish(0);
    }).catch(rejectFinish);

    return res;
}