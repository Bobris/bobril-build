declare module "uglifyjs" {
    interface IOutputStream {
        toString(): string;
    }

    interface IToken {
        type: string;
        file: string;
        value: string | number | RegExp;
        line: number;
        col: number;
        pos: number;
        endpos: number;
        nlb: boolean;
        comments_before: IToken[];
    }

    interface ISymbolDef {
        name: string;
        orig: ISymbolDeclaration[];
        scope: IScope;
        references: ISymbolRef[];
        global: boolean;
        undeclared: boolean;
        constant: boolean;
        mangled_name?: string;
    }

    interface ISymbol extends INode {
        scope?: IScope;
        name: string;
        thedef?: ISymbolDef;
    }

    interface INode {
        start?: IToken;
        end?: IToken;
        clone?(): INode;
        walk?(walker: IWalker);
        transform?(transformer: ITransformer): INode;
    }

    interface ICall extends INode {
        expression: INode;
        args: INode[];
    }

    interface IObjectProperty extends INode {
        key: string | INode;
        value: INode;
    }

    interface ISymbolRef extends ISymbol {
    }
    
    function AST_SymbolRef(props: ISymbolRef): ISymbolRef;
     
    interface ISymbolDeclaration extends ISymbol {
        init?: INode[];
    }

    interface IStatement extends INode {
    }

    interface IBlock extends IStatement {
        body?: IStatement[];
    }

    interface IScope extends IBlock {
        directives?: string[];
        variables?: { [name: string]: ISymbolDef };
        functions?: { [name: string]: ISymbolDef };
        uses_with?: boolean;
        uses_eval?: boolean;
        parent_scope?: IScope;
        enclosed?: ISymbolDef[];
        cname?: number;
    }

    interface ITopLevel extends IScope {
        globals?: { [name: string]: ISymbolDef };
        figure_out_scope?(): void;
        compute_char_frequency?(): void;
        mangle_names?(): void;
        print?(os: IOutputStream): void;
    }

    function AST_TopLevel(props: ITopLevel): ITopLevel;

    interface IOutputStreamOptions {
        beautify?: boolean;
    }

    interface ICompressorOptions {
        global_defs?: { [name: string]: any };
    }

    interface IParseOptions {
        filename?: string;
        strict?: boolean;
        toplevel?: ITopLevel;
    }

    interface IWalker {
        parent(n?: number): INode;
        stack: INode[];
        find_parent(type: any): INode;
        in_boolean_context(): boolean;

    }

    interface ITransformer extends IWalker {
    }

    function parse(code: string, options?: IParseOptions): ITopLevel;
    function OutputStream(options: IOutputStreamOptions): IOutputStream;
    function TreeWalker(visitor: (node: INode, descend: () => void) => boolean): IWalker;
    function TreeTransformer(before: (node: INode, descend: (node: INode, walker: IWalker) => void) => INode, after: (node: INode) => INode): ITransformer;
    function Compressor(options: ICompressorOptions): ITransformer;
}
