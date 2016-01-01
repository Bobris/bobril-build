import * as child_process from 'child_process';

export interface IProcess {
    finish: Promise<number>;
    kill(): void;
}

export function startPhantomJs(args:string[]): IProcess {
    let resolveFinish: (code: number) => void;
    let rejectFinish: (err: Error) => void;
    let phantomjs: child_process.ChildProcess;
    var res: IProcess = {
        finish: new Promise<number>((resolve, reject) => {
            resolveFinish = resolve;
            rejectFinish = reject;
        }),
        kill() {
            phantomjs.kill();
        }
    }

    const phantomPath = require('phantomjs').path;

    try {
        phantomjs = child_process.spawn(phantomPath, args);
        phantomjs.stdout.pipe(process.stdout);
        phantomjs.stderr.pipe(process.stderr);
        phantomjs.on('exit', function(code) {
            if (code == null) {
                rejectFinish(new Error("Finished without exit code"));
            } else {
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
