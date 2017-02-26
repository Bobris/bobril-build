"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
function runProcess(installCommand) {
    var subProcess = child_process_1.spawnSync(installCommand, {
        cwd: this.__dirname,
        env: process.env,
        stdio: 'inherit',
        shell: true
    });
    return subProcess.status === 0;
}
exports.runProcess = runProcess;
//# sourceMappingURL=processUtils.js.map