import * as chokidar from 'chokidar';
import * as debounce from './debounce';

export function watch(param: { paths:string[] }) {
    chokidar.watch(param.paths, { ignored: /[\/\\]\./, ignoreInitial: true }).once('ready', () => {
		process.send({ command: "watchReady" });
    }).on('all', debounce.debounce((v, v2) => {
		process.send({ command: "watchChange" });
	}));
}
