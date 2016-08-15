import { spawnSync } from 'child_process';
import { isWin } from './simpleHelpers';

const shellCommand = () => isWin() ? ['cmd', '/c'] : ['bash', '-c'];

export function runProcess(installCommand: string): boolean {
        const [command, arg] = shellCommand();

        var subProcess = spawnSync(command, [arg, installCommand], {
            cwd: this.__dirname,
            env: process.env,
            stdio: 'inherit'
        });

        return subProcess.status === 0;
    }
