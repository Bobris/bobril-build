export declare class XmlWritter {
    private humanReadable;
    private buf;
    private inElement;
    private wasEndElement;
    private shouldWriteNL;
    private preserveSpaces;
    private elementStack;
    private preserveStack;
    constructor(humanReadable?: boolean);
    getBuffer(): Buffer;
    private addNewLine();
    private flushElementBegin();
    writeHeader(): void;
    beginElement(elementName: string): void;
    beginElementPreserveSpaces(elementName: string, preserveSpaces: boolean): void;
    endElement(): void;
    addAttribute(name: string, value: string): void;
    addPCData(data: string): void;
    addXMLFragment(text: string): void;
    private indent(level);
    private translateString(text, isAttr);
}
