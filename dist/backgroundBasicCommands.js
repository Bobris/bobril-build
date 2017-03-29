"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function ping() {
    process.send({ command: "pong" });
}
exports.ping = ping;
function stop() {
    process.exit();
}
exports.stop = stop;
//# sourceMappingURL=backgroundBasicCommands.js.map