import { spawnSync } from 'child_process';

export function runProcess(installCommand: string): boolean {
        var subProcess = spawnSync('cmd', ['/c', installCommand], {
            cwd: this.__dirname,
            env: process.env,
            stdio: 'inherit'
        });
        console.log();
        return subProcess.status === 0;
    }
