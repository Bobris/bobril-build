import * as postcss from 'postcss';
import * as postcssUrl from 'postcss-url';
import * as cssnano from 'cssnano';

export function processCss(source:string,from:string,callback:(url:string, from:string)=>string):Promise<any> {
   return postcss([postcssUrl({ url: (oldUrl:string, decl:any, from:string, dirname:string, to:string, options:any, result:any)=>{
       if (oldUrl.startsWith("data:")) return oldUrl;
       return callback(oldUrl, from);
   }})]).process(source, { from });
}

export function concatenateCssAndMinify(inputs: { source:string, from:string }[],callback:(url:string, from:string)=>string):Promise<any> {
    return Promise.all<any>(inputs.map((i)=>{
        return processCss(i.source,i.from,callback);
    })).then(results => {
        let r = results[0].root;
        for(let i=1; i<results.length; i++) {
            r=r.append(results[i].root);
        }
        return postcss([cssnano({ safe:true })]).process(r.toResult());
    });
}
