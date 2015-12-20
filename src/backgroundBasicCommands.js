"use strict";
function ping() {
    process.send({ command: "pong" });
}
exports.ping = ping;
function stop() {
    process.exit();
}
exports.stop = stop;
