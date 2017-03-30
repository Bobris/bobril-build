export declare function processCss(source: string, from: string, callback: (url: string, from: string) => string): PromiseLike<any>;
export declare function concatenateCssAndMinify(inputs: {
    source: string;
    from: string;
}[], callback: (url: string, from: string) => string): Promise<any>;
