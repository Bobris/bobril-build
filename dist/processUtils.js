"use strict";
const child_process_1 = require('child_process');
function runProcess(installCommand) {
    var subProcess = child_process_1.spawnSync('cmd', ['/c', installCommand], {
        cwd: this.__dirname,
        env: process.env,
        stdio: 'inherit'
    });
    console.log();
    return subProcess.status === 0;
}
exports.runProcess = runProcess;
//# sourceMappingURL=processUtils.js.map