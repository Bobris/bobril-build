declare module "postcss-url" {
	interface Opt {
		url: string | ((oldUrl:string, decl:any, from:string, dirname:string, to:string, options:any, result:any) => string);
	}
    function p(opt?:Opt):any;
    module p {
        
    }
	export = p;
}
