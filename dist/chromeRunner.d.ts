export interface IChromeProcess {
    finish: Promise<number>;
    kill(): void;
}
export declare function launchChrome(url: any): IChromeProcess;
