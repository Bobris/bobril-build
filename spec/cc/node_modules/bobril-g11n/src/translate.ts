import * as msgFormatParser from "./msgFormatParser";
import * as msgFormatter from './msgFormatter';
import * as b from 'bobril';
import { jsonp } from './jsonp';
import * as localeDataStorage from './localeDataStorage';

export interface IG11NConfig {
    defaultLocale?: string;
    pathToTranslation?: (locale: string) => string;
}

interface IMessageFormat {
    (params?: Object): string;
}

let cfg: IG11NConfig = {};
let loadedLocales: { [name: string]: boolean } = Object.create(null);
let registeredTranslations: { [name: string]: string[] } = Object.create(null);
let initWasStarted = false;
let currentLocale = '';
let currentTranslations: string[] = [];
let currentCachedFormat: IMessageFormat[] = [];
let stringCachedFormats: { [input: string]: IMessageFormat } = Object.create(null);

function currentTranslationMessage(message: number): string {
    let text = currentTranslations[message];
    if (text === undefined) {
        throw new Error('message ' + message + ' is not defined');
    }
    return text;
}

export function t(message: string | number, params?: Object, translationHelp?: string): string {
    if (currentLocale.length === 0) {
        throw new Error('before using t you need to wait for initialization of g11n');
    }
    let format: IMessageFormat;
    if (typeof message === 'number') {
        if (params == null) {
            return currentTranslationMessage(message);
        }
        format = currentCachedFormat[message];
        if (format === undefined) {
            let ast = msgFormatParser.parse(currentTranslationMessage(message));
            if (ast.type === 'error') {
                throw new Error('message ' + message + ' in ' + currentLocale + ' has error: ' + ast.msg);
            }
            format = msgFormatter.compile(currentLocale, ast);
            currentCachedFormat[message] = format;
        }
    } else {
        if (params == null) return message;
        format = stringCachedFormats[message];
        if (format === undefined) {
            let ast = msgFormatParser.parse(message);
            if (ast.type === 'error') {
                throw new Error('message "' + message + '" has error: ' + ast.msg + ' on position: ' + ast.pos);
            }
            format = msgFormatter.compile(currentLocale, ast);
            stringCachedFormats[message] = format;
        }
    }
    return format(params);
}

export function initGlobalization(config?: IG11NConfig): Promise<any> {
    if (initWasStarted) {
        throw new Error('initLocalization must be called only once');
    }
    cfg = config;
    initWasStarted = true;
    var prom = Promise.resolve<any>(null);
    prom = prom.then(() => setLocale(config.defaultLocale || 'en'));
    b.setBeforeInit((cb: (_:any)=>void) => {
        prom.then(cb);
    });
    return prom;
}

export function setLocale(locale: string): Promise<any> {
    let prom = Promise.resolve(null);
    if (currentLocale === locale)
        return prom;
    if (!loadedLocales[locale]) {
        loadedLocales[locale] = true;
        let pathToTranslation = cfg.pathToTranslation;
        if (pathToTranslation) {
			let p = pathToTranslation(locale);
			if (p) {
				prom = prom.then(() => {
					return jsonp(p);
				});
			}
        }
    }
    prom = prom.then(() => {
        currentLocale = locale;
        currentTranslations = registeredTranslations[locale] || [];
        currentCachedFormat = [];
        currentCachedFormat.length = currentTranslations.length;
        b.ignoreShouldChange();
    });
    return prom;
}

export function getLocale(): string {
    return currentLocale;
}

export function registerTranslations(locale: string, localeDefs:any[], msgs: string[]): void {
    if (Array.isArray(localeDefs)) {
        if (localeDefs.length>=1) localeDataStorage.setPluralRule(locale, localeDefs[0]);
    }
    if (Array.isArray(msgs))
        registeredTranslations[locale] = msgs;
    loadedLocales[locale] = true;
}

if (window)
    (<any>window)['bobrilRegisterTranslations'] = registerTranslations;
