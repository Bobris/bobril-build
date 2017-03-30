export interface IProcess {
    finish: Promise<number>;
    kill(): void;
}
export declare function startPhantomJs(args: string[]): IProcess;
