export interface IG11NConfig {
    defaultLocale?: string;
    pathToTranslation?: (locale: string) => string;
}
export declare function t(message: string | number, params?: Object, translationHelp?: string): string;
export declare function f(message: string, params: Object): string;
export declare function initGlobalization(config?: IG11NConfig): Promise<any>;
export declare function setLocale(locale: string): Promise<any>;
export declare function getLocale(): string;
export declare function registerTranslations(locale: string, localeDefs: any[], msgs: string[]): void;
