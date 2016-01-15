import * as postcss from 'postcss';
import * as postcssUrl from 'postcss-url';

export function processCss(source:string,from:string,callback:(url:string, from:string)=>string):Promise<any> {
   return postcss([postcssUrl({ url: (oldUrl:string, decl:any, from:string, dirname:string, to:string, options:any, result:any)=>{
       return callback(oldUrl, from);
   }})]).process(source, { from });
}
