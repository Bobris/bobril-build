import * as chokidar from 'chokidar';
import * as debounce from './debounce';

export function watch(param: { cwd: string, paths:string[], filter:string }) {
    let filterRe = new RegExp(param.filter);
    let w = chokidar.watch(param.paths, { cwd: param.cwd, ignored: /[\/\\]\./, ignoreInitial: false });
    w.on('all', debounce.debounce((v, v2) => {
        let wa=(<any>w).getWatched();
        let k = Object.keys(wa);
        let res=Object.create(null);
        k.forEach((v)=>{
           if (v==="..") return;
           let items = wa[v];
           if (items.length===0) return;
           items=items.filter((i)=>filterRe.test(i));
           if (items.length===0) return;
           res[v.replace(/\\/g,"/")]=items;           
        });
		process.send({ command: "watchChange", param: res });
	}));
}
