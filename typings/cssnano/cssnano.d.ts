declare module "cssnano" {
	interface Opt {
		safe?: boolean;
	}
    function p(opt?:Opt):any;
    module p {
    }
	export = p;
}
