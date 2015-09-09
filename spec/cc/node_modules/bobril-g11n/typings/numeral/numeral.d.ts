interface Numeral {
    language(name:string);
    format(pattern:string):string;
}

declare module "" {
    var numeral:(value: number)=>Numeral;
    export = numeral;
}
