export function ping() {
	process.send({ command: "pong" });
}

export function stop() {
	process.exit();
}