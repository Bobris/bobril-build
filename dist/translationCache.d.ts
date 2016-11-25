import * as BuildHelpers from './buildHelpers';
import * as CompilationCache from './compilationCache';
export declare class TranslationDb implements CompilationCache.ICompilationTranslation {
    db: {
        [messsageAndHint: string]: (string | number)[];
    };
    langs: string[];
    usages: {
        [filename: string]: {
            [key: string]: boolean;
        };
    };
    availNumbers: number[];
    nextFreeId: number;
    changeInMessageIds: boolean;
    addedMessage: boolean;
    constructor();
    clear(): void;
    addLang(name: string): number;
    buildKey(message: string, hint: string, hasParams: boolean): string;
    loadLangDbs(dir: string): void;
    loadLangDb(fileName: string): void;
    removeLang(lang: string): void;
    saveLangDbs(dir: string): void;
    saveLangDb(filename: string, lang: string): void;
    pruneUnusedMesssages(): void;
    currentFileUsages: {
        [key: string]: boolean;
    };
    newFileUsages: {
        [key: string]: boolean;
    };
    allocId(): number;
    freeId(id: number): void;
    clearBeforeCompilation(): void;
    startCompileFile(fn: string): void;
    addUsageOfMessage(info: BuildHelpers.TranslationMessage): number;
    finishCompileFile(fn: string): void;
    getMessageArrayInLang(lang: string): string[];
    getForTranslationLang(lang: string): [string, string, string, number, string][];
    setForTranslationLang(lang: string, trs: [string, string, string, number, string][]): void;
    importTranslatedLanguage(filePathFrom: string, filePathTo?: string): boolean;
    private parseText(text);
    private importTranslatedLanguageInternal(filePath, callback);
    private exportLanguageItem(source, hint);
    getLanguageFromSpecificFile(path: string): any;
    exportUntranslatedLanguages(filePath: string, language?: string, specificPath?: string): boolean;
    makeUnionOfExportedLanguages(filePath1: string, filePath2: string, outputPath: string): boolean;
    makeSubtractOfExportedLanguages(filePath1: string, filePath2: string, outputPath: string): boolean;
    private saveExportedLanguages(outputPath, data);
}
