import { spawnSync } from 'child_process';

export function runProcess(installCommand: string): boolean {

    var subProcess = spawnSync(installCommand, {
        cwd: this.__dirname,
        env: process.env,
        stdio: 'inherit',
        shell: true
    });

    return subProcess.status === 0;
}
