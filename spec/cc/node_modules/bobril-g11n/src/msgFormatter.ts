import { RuntimeFunctionGenerator } from './RuntimeFunctionGenerator';
import * as localeDataStorage from './localeDataStorage';

declare var require: any;
var numeral = require('numeral');
var moment = require('moment');
(<any>window).moment = moment;

function AnyFormatter(locale: string, type: string, style: string, options: Object): (value: any, options: Object) => string {
    let language = localeDataStorage.getLanguageFromLocale(locale);
    switch (type) {
        case 'number': {
            if (style === 'custom' && 'format' in options) {
                return (val, opt) => { numeral.language(language); return numeral(val).format((<any>opt).format); };
            }
            if (style === 'default') {
                return (val, opt) => { numeral.language(language); return numeral(val).format('0,0.[0000]') };
            }
            if (style === 'percent') {
                return (val, opt) => { numeral.language(language); return numeral(val).format('0%') };
            }
            if (style === 'bytes') {
                return (val, opt) => { numeral.language(language); return numeral(val).format('0b') };
            }
            break;
        }
        case 'date':
        case 'time': {
            if (style === 'relative') {
                if ((<any>options)['noago'] === true) {
                    return (val, opt) => { return moment(val).locale(language).fromNow(true); };
                }
                if ((<any>options)['noago'] === null) {
                    return (val, opt) => { return moment(val).locale(language).fromNow((<any>opt)['noago']); };
                }
                return (val, opt) => { return moment(val).locale(language).fromNow(false); };
            }
            if (style === 'calendar') {
                return (val, opt) => { return moment(val).locale(language).calendar(); };
            }
            if (style === 'custom' && 'format' in options) {
                return (val, opt) => { return moment(val).locale(language).format((<any>opt).format); };
            }
            return (val, opt) => { return moment(val).locale(language).format(style); };
        }
    }
}

export function compile(locale: string, msgAst: any): (params: Object, hashArg?: string) => string {
    if (typeof msgAst === 'string') {
        return () => msgAst;
    }
    if (Array.isArray(msgAst)) {
        if (msgAst.length === 0) return () => '';
        let comp = new RuntimeFunctionGenerator();
        let argParams = comp.addArg(0);
        let argHash = comp.addArg(1);
        comp.addBody('return ');
        for (let i = 0; i < msgAst.length; i++) {
            if (i > 0) comp.addBody('+');
            let item = msgAst[i];
            if (typeof item === 'string') {
                comp.addBody(comp.addConstant(item));
            } else {
                comp.addBody(comp.addConstant(compile(locale, item)) + `(${argParams},${argHash})`);
            }
        }
        comp.addBody(';');
        return <(params: Object, hashArg?: string) => string>comp.build();
    }
    switch (msgAst.type) {
        case 'arg':
            return ((name: string) => (params: Object) => (<any>params)[name])(msgAst.id);
        case 'hash':
            return (params, hashArg) => {
                if (hashArg === undefined) return '#';
                return hashArg;
            };
        case 'format':
            let comp = new RuntimeFunctionGenerator();
            let argParams = comp.addArg(0);
            let localArg = comp.addLocal();
            comp.addBody(`var ${localArg}=${argParams}[${comp.addConstant(msgAst.id) }];`);
            let type = msgAst.format.type;
            switch (type) {
                case 'plural':
                    {
                        let localArgOffset = comp.addLocal();
                        comp.addBody(`var ${localArgOffset}=${localArg}-${msgAst.format.offset};`);
                        let options = msgAst.format.options;
                        for (let i = 0; i < options.length; i++) {
                            let opt = options[i];
                            if (typeof opt.selector !== 'number') continue;
                            let fn = comp.addConstant(compile(locale, opt.value));
                            comp.addBody(`if (${localArgOffset}===${opt.selector}) return ${fn}(${argParams},''+${localArgOffset});`);
                        }
                        let localCase = comp.addLocal();
                        let pluralFn = comp.addConstant(localeDataStorage.getPluralRule(locale));
                        comp.addBody(`var ${localCase}=${pluralFn}(${localArgOffset},${msgAst.format.ordinal ? 'true' : 'false'});`);
                        for (let i = 0; i < options.length; i++) {
                            let opt = options[i];
                            if (typeof opt.selector !== 'string') continue;
                            if (opt.selector === 'other') continue;
                            let fn = comp.addConstant(compile(locale, opt.value));
                            comp.addBody(`if (${localCase}===${comp.addConstant(opt.selector) }) return ${fn}(${argParams},''+${localArgOffset});`);
                        }
                        for (let i = 0; i < options.length; i++) {
                            let opt = options[i];
                            if (opt.selector !== 'other') continue;
                            let fn = comp.addConstant(compile(locale, opt.value));
                            comp.addBody(`return ${fn}(${argParams},''+${localArgOffset});`);
                        }
                        break;
                    }
                case 'select':
                    {
                        let options = msgAst.format.options;
                        for (let i = 0; i < options.length; i++) {
                            let opt = options[i];
                            if (typeof opt.selector !== 'string') continue;
                            if (opt.selector === 'other') continue;
                            let fn = comp.addConstant(compile(locale, opt.value));
                            comp.addBody(`if (${localArg}===${comp.addConstant(opt.selector) }) return ${fn}(${argParams},${localArg});`);
                        }
                        for (let i = 0; i < options.length; i++) {
                            let opt = options[i];
                            if (opt.selector !== 'other') continue;
                            let fn = comp.addConstant(compile(locale, opt.value));
                            comp.addBody(`return ${fn}(${argParams},${localArg});`);
                        }
                        break;
                    }
                case 'number':
                case 'date':
                case 'time':
                    {
                        let style = msgAst.format.style || 'default';
                        let options = msgAst.format.options;
                        if (options) {
                            let opt = {};
                            let complex = false;
                            for (let i = 0; i < options.length; i++) {
                                if (typeof options[i].value === 'object') {
                                    complex = true;
                                    (<any>opt)[options[i].key] = null;
                                } else {
                                    let val = options[i].value;
                                    if (val === undefined) val = true;
                                    (<any>opt)[options[i].key] = val;
                                }
                            }
                            let formatFn = comp.addConstant(AnyFormatter(locale, type, style, opt));
                            if (complex) {
                                let optConst = comp.addConstant(opt);
                                let optLocal = comp.addLocal();
                                let hashArg = comp.addArg(1);
                                comp.addBody(`var ${optLocal}=${optConst};`);
                                for (let i = 0; i < options.length; i++) {
                                    if (typeof options[i].value === 'object') {
                                        let fnConst = comp.addConstant(compile(locale, options[i].value));
                                        comp.addBody(`${optLocal}[${comp.addConstant(options[i].key) }]=${fnConst}(${argParams},${hashArg});`);
                                    }
                                }
                                comp.addBody(`return ${formatFn}(${localArg},${optLocal});`);
                            } else {
                                comp.addBody(`return ${formatFn}(${localArg},${comp.addConstant(opt) });`);
                            }
                        } else {
                            let formatFn = comp.addConstant(AnyFormatter(locale, type, style, null));
                            comp.addBody(`return ${formatFn}(${localArg});`);
                        }
                    }
            }
            return <(params: Object, hashArg?: string) => string>comp.build();
    }
}
