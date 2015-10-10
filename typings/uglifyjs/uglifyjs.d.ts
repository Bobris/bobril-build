declare module "uglifyjs" {
    interface IOutputStream {
        toString(): string;
    }

    interface IAstToken {
        type: string;
        file: string;
        value: string | number | RegExp;
        line: number;
        col: number;
        pos: number;
        endpos: number;
        nlb: boolean;
        comments_before: IAstToken[];
    }

    interface ISymbolDef {
        name: string;
        orig: IAstSymbolDeclaration[];
        scope: IAstScope;
        references: IAstSymbolRef[];
        global: boolean;
        undeclared: boolean;
        constant: boolean;
        mangled_name?: string;
    }

    /// Base class of all AST nodes
    interface IAstNode {
        /// The first token of this node
        start?: IAstToken;
        /// The last token of this node
        end?: IAstToken;
        clone?(): IAstNode;
        walk?(walker: IWalker);
        transform?(transformer: ITransformer): IAstNode;
    }

    /// Base class of all AST nodes
    function AST_Node(props?: IAstNode): IAstNode;

    /// Base class of all statements
    interface IAstStatement extends IAstNode {
    }

    /// Base class of all statements
    function AST_Statement(props?: IAstStatement): IAstStatement;

    /// Represents a debugger statement
    interface IAstDebugger extends IAstStatement {
    }

    /// Represents a debugger statement
    function AST_Debugger(props?: IAstDebugger): IAstDebugger;

    /// Represents a directive, like "use strict";
    interface IAstDirective extends IAstStatement {
        /// The value of this directive as a plain string (it's not an AST_String!)
        value?: string;
        /// The scope that this directive affects (After Scope)
        scope?: IAstScope;
        /// the original quote character
        quote?: string;
    }

    /// Represents a directive, like "use strict";
    function AST_Directive(props?: IAstDirective): IAstDirective;

    /// A statement consisting of an expression, i.e. a = 1 + 2
    interface IAstSimpleStatement extends IAstStatement {
        /// an expression node (should not be instanceof AST_Statement)
        body?: IAstNode;
    }

    /// A statement consisting of an expression, i.e. a = 1 + 2
    function AST_SimpleStatement(props?: IAstSimpleStatement): IAstSimpleStatement;

    /// A body of statements (usually bracketed)
    interface IAstBlock extends IAstStatement {
        /// an array of statements
        body?: IAstStatement[];
    }

    /// A body of statements (usually bracketed)
    function AST_Block(props?: IAstBlock): IAstBlock;

    /// A block statement
    interface IAstBlockStatement extends IAstBlock {
    }

    /// A block statement
    function AST_BlockStatement(props?: IAstBlockStatement): IAstBlockStatement;

    /// Base class for all statements introducing a lexical scope
    interface IAstScope extends IAstBlock {
        /// an array of directives declared in this scope (After Scope)
        directives?: string[];
        /// a map of name -> SymbolDef for all variables/functions defined in this scope (After Scope)
        variables?: { [name: string]: ISymbolDef };
        /// like `variables`, but only lists function declarations (After Scope)
        functions?: { [name: string]: ISymbolDef };
        /// tells whether this scope uses the `with` statement (After Scope)
        uses_with?: boolean;
        /// tells whether this scope contains a direct call to the global `eval` (After Scope)
        uses_eval?: boolean;
        /// link to the parent scope (After Scope)
        parent_scope?: IAstScope;
        /// a list of all symbol definitions that are accessed from this scope or any subscopes (After Scope)
        enclosed?: ISymbolDef[];
        /// current index for mangling variables (used internally by the mangler) (After Scope)
        cname?: number;
    }

    /// Base class for all statements introducing a lexical scope
    function AST_Scope(props?: IAstScope): IAstScope;

    /// The toplevel scope
    interface IAstToplevel extends IAstScope {
        /// a map of name -> SymbolDef for all undeclared names (After Scope)
        globals?: { [name: string]: any };

        figure_out_scope?(): void;
        compute_char_frequency?(): void;
        mangle_names?(): void;
        print?(os: IOutputStream): void;
    }

    /// The toplevel scope
    function AST_Toplevel(props?: IAstToplevel): IAstToplevel;

    /// Base class for functions
    interface IAstLambda extends IAstScope {
        /// the name of this function
        name?: IAstSymbolDeclaration;
        /// array of function arguments
        argnames?: IAstSymbolFunarg[];
        /// tells whether this function accesses the arguments array (After Scope)
        uses_arguments?: boolean;
    }

    /// Base class for functions
    function AST_Lambda(props?: IAstLambda): IAstLambda;

    /// A setter/getter function.  The `name` property is always null.
    interface IAstAccessor extends IAstLambda {
    }

    /// A setter/getter function.  The `name` property is always null.
    function AST_Accessor(props?: IAstAccessor): IAstAccessor;

    /// A function expression
    interface IAstFunction extends IAstLambda {
    }

    /// A function expression
    function AST_Function(props?: IAstFunction): IAstFunction;

    /// A function definition
    interface IAstDefun extends IAstLambda {
    }

    /// A function definition
    function AST_Defun(props?: IAstDefun): IAstDefun;

    /// A `switch` statement
    interface IAstSwitch extends IAstBlock {
        /// the `switch` “discriminant”
        expression?: IAstNode;
    }

    /// A `switch` statement
    function AST_Switch(props?: IAstSwitch): IAstSwitch;

    /// Base class for `switch` branches
    interface IAstSwitchBranch extends IAstBlock {
    }

    /// Base class for `switch` branches
    function AST_SwitchBranch(props?: IAstSwitchBranch): IAstSwitchBranch;

    /// A `default` switch branch
    interface IAstDefault extends IAstSwitchBranch {
    }

    /// A `default` switch branch
    function AST_Default(props?: IAstDefault): IAstDefault;

    /// A `case` switch branch
    interface IAstCase extends IAstSwitchBranch {
        /// the `case` expression
        expression?: IAstNode;
    }

    /// A `case` switch branch
    function AST_Case(props?: IAstCase): IAstCase;

    /// A `try` statement
    interface IAstTry extends IAstBlock {
        /// the catch block, or null if not present
        bcatch?: IAstCatch;
        /// the finally block, or null if not present
        bfinally?: IAstFinally;
    }

    /// A `try` statement
    function AST_Try(props?: IAstTry): IAstTry;

    /// A `catch` node; only makes sense as part of a `try` statement
    interface IAstCatch extends IAstBlock {
        /// symbol for the exception
        argname?: IAstSymbolCatch;
    }

    /// A `catch` node; only makes sense as part of a `try` statement
    function AST_Catch(props?: IAstCatch): IAstCatch;

    /// A `finally` node; only makes sense as part of a `try` statement
    interface IAstFinally extends IAstBlock {
    }

    /// A `finally` node; only makes sense as part of a `try` statement
    function AST_Finally(props?: IAstFinally): IAstFinally;

    /// The empty statement (empty block or simply a semicolon)
    interface IAstEmptyStatement extends IAstStatement {
    }

    /// The empty statement (empty block or simply a semicolon)
    function AST_EmptyStatement(props?: IAstEmptyStatement): IAstEmptyStatement;

    /// Base class for all statements that contain one nested body: `For`, `ForIn`, `Do`, `While`, `With`
    interface IAstStatementWithBody extends IAstStatement {
        /// the body; this should always be present, even if it's an AST_EmptyStatement
        body?: IAstStatement;
    }

    /// Base class for all statements that contain one nested body: `For`, `ForIn`, `Do`, `While`, `With`
    function AST_StatementWithBody(props?: IAstStatementWithBody): IAstStatementWithBody;

    /// Statement with a label
    interface IAstLabeledStatement extends IAstStatementWithBody {
        /// a label definition
        label?: IAstLabel;
    }

    /// Statement with a label
    function AST_LabeledStatement(props?: IAstLabeledStatement): IAstLabeledStatement;

    /// Internal class.  All loops inherit from it.
    interface IAstIterationStatement extends IAstStatementWithBody {
    }

    /// Internal class.  All loops inherit from it.
    function AST_IterationStatement(props?: IAstIterationStatement): IAstIterationStatement;

    /// Base class for do/while statements
    interface IAstDWLoop extends IAstIterationStatement {
        /// the loop condition.  Should not be instanceof AST_Statement
        condition?: IAstNode;
    }

    /// Base class for do/while statements
    function AST_DWLoop(props?: IAstDWLoop): IAstDWLoop;

    /// A `do` statement
    interface IAstDo extends IAstDWLoop {
    }

    /// A `do` statement
    function AST_Do(props?: IAstDo): IAstDo;

    /// A `while` statement
    interface IAstWhile extends IAstDWLoop {
    }

    /// A `while` statement
    function AST_While(props?: IAstWhile): IAstWhile;

    /// A `for` statement
    interface IAstFor extends IAstIterationStatement {
        /// the `for` initialization code, or null if empty
        init?: IAstNode;
        /// the `for` termination clause, or null if empty
        condition?: IAstNode;
        /// the `for` update clause, or null if empty
        step?: IAstNode;
    }

    /// A `for` statement
    function AST_For(props?: IAstFor): IAstFor;

    /// A `for ... in` statement
    interface IAstForIn extends IAstIterationStatement {
        /// the `for/in` initialization code
        init?: IAstNode;
        /// the loop variable, only if `init` is AST_Var
        name?: IAstSymbolRef;
        /// the object that we're looping through
        object?: IAstNode;
    }

    /// A `for ... in` statement
    function AST_ForIn(props?: IAstForIn): IAstForIn;

    /// A `with` statement
    interface IAstWith extends IAstStatementWithBody {
        /// the `with` expression
        expression?: IAstNode;
    }

    /// A `with` statement
    function AST_With(props?: IAstWith): IAstWith;

    /// A `if` statement
    interface IAstIf extends IAstStatementWithBody {
        /// the `if` condition
        condition?: IAstNode;
        /// the `else` part, or null if not present
        alternative?: IAstStatement;
    }

    /// A `if` statement
    function AST_If(props?: IAstIf): IAstIf;

    /// Base class for “jumps” (for now that's `return`, `throw`, `break` and `continue`)
    interface IAstJump extends IAstStatement {
    }

    /// Base class for “jumps” (for now that's `return`, `throw`, `break` and `continue`)
    function AST_Jump(props?: IAstJump): IAstJump;

    /// Base class for “exits” (`return` and `throw`)
    interface IAstExit extends IAstJump {
        /// the value returned or thrown by this statement; could be null for AST_Return
        value?: IAstNode;
    }

    /// Base class for “exits” (`return` and `throw`)
    function AST_Exit(props?: IAstExit): IAstExit;

    /// A `return` statement
    interface IAstReturn extends IAstExit {
    }

    /// A `return` statement
    function AST_Return(props?: IAstReturn): IAstReturn;

    /// A `throw` statement
    interface IAstThrow extends IAstExit {
    }

    /// A `throw` statement
    function AST_Throw(props?: IAstThrow): IAstThrow;

    /// Base class for loop control statements (`break` and `continue`)
    interface IAstLoopControl extends IAstJump {
        /// the label, or null if none
        label?: IAstLabelRef;
    }

    /// Base class for loop control statements (`break` and `continue`)
    function AST_LoopControl(props?: IAstLoopControl): IAstLoopControl;

    /// A `break` statement
    interface IAstBreak extends IAstLoopControl {
    }

    /// A `break` statement
    function AST_Break(props?: IAstBreak): IAstBreak;

    /// A `continue` statement
    interface IAstContinue extends IAstLoopControl {
    }

    /// A `continue` statement
    function AST_Continue(props?: IAstContinue): IAstContinue;

    /// Base class for `var` or `const` nodes (variable declarations/initializations)
    interface IAstDefinitions extends IAstStatement {
        /// array of variable definitions
        definitions?: IAstVarDef[];
    }

    /// Base class for `var` or `const` nodes (variable declarations/initializations)
    function AST_Definitions(props?: IAstDefinitions): IAstDefinitions;

    /// A `var` statement
    interface IAstVar extends IAstDefinitions {
    }

    /// A `var` statement
    function AST_Var(props?: IAstVar): IAstVar;

    /// A `const` statement
    interface IAstConst extends IAstDefinitions {
    }

    /// A `const` statement
    function AST_Const(props?: IAstConst): IAstConst;

    /// A variable declaration; only appears in a AST_Definitions node
    interface IAstVarDef extends IAstNode {
        /// name of the variable
        name?: IAstSymbolVar | IAstSymbolConst;
        /// initializer, or null of there's no initializer
        value?: IAstNode;
    }

    /// A variable declaration; only appears in a AST_Definitions node
    function AST_VarDef(props?: IAstVarDef): IAstVarDef;

    /// A function call expression
    interface IAstCall extends IAstNode {
        /// expression to invoke as function
        expression?: IAstNode;
        /// array of arguments
        args?: IAstNode[];
    }

    /// A function call expression
    function AST_Call(props?: IAstCall): IAstCall;

    /// An object instantiation.  Derives from a function call since it has exactly the same properties
    interface IAstNew extends IAstCall {
    }

    /// An object instantiation.  Derives from a function call since it has exactly the same properties
    function AST_New(props?: IAstNew): IAstNew;

    /// A sequence expression (two comma-separated expressions)
    interface IAstSeq extends IAstNode {
        /// first element in sequence
        car?: IAstNode;
        /// second element in sequence
        cdr?: IAstNode;
    }

    /// A sequence expression (two comma-separated expressions)
    function AST_Seq(props?: IAstSeq): IAstSeq;

    /// Base class for property access expressions, i.e. `a.foo` or `a["foo"]`
    interface IAstPropAccess extends IAstNode {
        /// the “container” expression
        expression?: IAstNode;
        /// the property to access.  For AST_Dot this is always a plain string, while for AST_Sub it's an arbitrary AST_Node
        property?: IAstNode | string;
    }

    /// Base class for property access expressions, i.e. `a.foo` or `a["foo"]`
    function AST_PropAccess(props?: IAstPropAccess): IAstPropAccess;

    /// A dotted property access expression
    interface IAstDot extends IAstPropAccess {
    }

    /// A dotted property access expression
    function AST_Dot(props?: IAstDot): IAstDot;

    /// Index-style property access, i.e. `a["foo"]`
    interface IAstSub extends IAstPropAccess {
    }

    /// Index-style property access, i.e. `a["foo"]`
    function AST_Sub(props?: IAstSub): IAstSub;

    /// Base class for unary expressions
    interface IAstUnary extends IAstNode {
        /// the operator
        operator?: string;
        /// expression that this unary operator applies to
        expression?: IAstNode;
    }

    /// Base class for unary expressions
    function AST_Unary(props?: IAstUnary): IAstUnary;

    /// Unary prefix expression, i.e. `typeof i` or `++i`
    interface IAstUnaryPrefix extends IAstUnary {
    }

    /// Unary prefix expression, i.e. `typeof i` or `++i`
    function AST_UnaryPrefix(props?: IAstUnaryPrefix): IAstUnaryPrefix;

    /// Unary postfix expression, i.e. `i++`
    interface IAstUnaryPostfix extends IAstUnary {
    }

    /// Unary postfix expression, i.e. `i++`
    function AST_UnaryPostfix(props?: IAstUnaryPostfix): IAstUnaryPostfix;

    /// Binary expression, i.e. `a + b`
    interface IAstBinary extends IAstNode {
        /// left-hand side expression
        left?: IAstNode;
        /// the operator
        operator?: string;
        /// right-hand side expression
        right?: IAstNode;
    }

    /// Binary expression, i.e. `a + b`
    function AST_Binary(props?: IAstBinary): IAstBinary;

    /// An assignment expression — `a = b + 5`
    interface IAstAssign extends IAstBinary {
    }

    /// An assignment expression — `a = b + 5`
    function AST_Assign(props?: IAstAssign): IAstAssign;

    /// Conditional expression using the ternary operator, i.e. `a ? b : c`
    interface IAstConditional extends IAstNode {
        /// 
        condition?: IAstNode;
        /// 
        consequent?: IAstNode;
        /// 
        alternative?: IAstNode;
    }

    /// Conditional expression using the ternary operator, i.e. `a ? b : c`
    function AST_Conditional(props?: IAstConditional): IAstConditional;

    /// An array literal
    interface IAstArray extends IAstNode {
        /// array of elements
        elements?: IAstNode[];
    }

    /// An array literal
    function AST_Array(props?: IAstArray): IAstArray;

    /// An object literal
    interface IAstObject extends IAstNode {
        /// array of properties
        properties?: IAstObjectProperty[];
    }

    /// An object literal
    function AST_Object(props?: IAstObject): IAstObject;

    /// Base class for literal object properties
    interface IAstObjectProperty extends IAstNode {
        /// the property name converted to a string for ObjectKeyVal.  For setters and getters this is an arbitrary AST_Node.
        key?: string;
        /// property value.  For setters and getters this is an AST_Function.
        value?: IAstNode;
    }

    /// Base class for literal object properties
    function AST_ObjectProperty(props?: IAstObjectProperty): IAstObjectProperty;

    /// A key: value object property
    interface IAstObjectKeyVal extends IAstObjectProperty {
        /// the original quote character
        quote?: string;
    }

    /// A key: value object property
    function AST_ObjectKeyVal(props?: IAstObjectKeyVal): IAstObjectKeyVal;

    /// An object setter property
    interface IAstObjectSetter extends IAstObjectProperty {
    }

    /// An object setter property
    function AST_ObjectSetter(props?: IAstObjectSetter): IAstObjectSetter;

    /// An object getter property
    interface IAstObjectGetter extends IAstObjectProperty {
    }

    /// An object getter property
    function AST_ObjectGetter(props?: IAstObjectGetter): IAstObjectGetter;

    /// Base class for all symbols
    interface IAstSymbol extends IAstNode {
        /// the current scope (not necessarily the definition scope) (After Scope)
        scope?: IAstScope;
        /// name of this symbol
        name?: string;
        /// the definition of this symbol (After Scope)
        thedef?: ISymbolDef;
    }

    /// Base class for all symbols
    function AST_Symbol(props?: IAstSymbol): IAstSymbol;

    /// The name of a property accessor (setter/getter function)
    interface IAstSymbolAccessor extends IAstSymbol {
    }

    /// The name of a property accessor (setter/getter function)
    function AST_SymbolAccessor(props?: IAstSymbolAccessor): IAstSymbolAccessor;

    /// A declaration symbol (symbol in var/const, function name or argument, symbol in catch)
    interface IAstSymbolDeclaration extends IAstSymbol {
        /// array of initializers for this declaration. (After Scope)
        init?: IAstNode[];
    }

    /// A declaration symbol (symbol in var/const, function name or argument, symbol in catch)
    function AST_SymbolDeclaration(props?: IAstSymbolDeclaration): IAstSymbolDeclaration;

    /// Symbol defining a variable
    interface IAstSymbolVar extends IAstSymbolDeclaration {
    }

    /// Symbol defining a variable
    function AST_SymbolVar(props?: IAstSymbolVar): IAstSymbolVar;

    /// Symbol naming a function argument
    interface IAstSymbolFunarg extends IAstSymbolVar {
    }

    /// Symbol naming a function argument
    function AST_SymbolFunarg(props?: IAstSymbolFunarg): IAstSymbolFunarg;

    /// A constant declaration
    interface IAstSymbolConst extends IAstSymbolDeclaration {
    }

    /// A constant declaration
    function AST_SymbolConst(props?: IAstSymbolConst): IAstSymbolConst;

    /// Symbol defining a function
    interface IAstSymbolDefun extends IAstSymbolDeclaration {
    }

    /// Symbol defining a function
    function AST_SymbolDefun(props?: IAstSymbolDefun): IAstSymbolDefun;

    /// Symbol naming a function expression
    interface IAstSymbolLambda extends IAstSymbolDeclaration {
    }

    /// Symbol naming a function expression
    function AST_SymbolLambda(props?: IAstSymbolLambda): IAstSymbolLambda;

    /// Symbol naming the exception in catch
    interface IAstSymbolCatch extends IAstSymbolDeclaration {
    }

    /// Symbol naming the exception in catch
    function AST_SymbolCatch(props?: IAstSymbolCatch): IAstSymbolCatch;

    /// Symbol naming a label (declaration)
    interface IAstLabel extends IAstSymbol {
        /// a list of nodes referring to this label
        references?: IAstLoopControl[];
    }

    /// Symbol naming a label (declaration)
    function AST_Label(props?: IAstLabel): IAstLabel;

    /// Reference to some symbol (not definition/declaration)
    interface IAstSymbolRef extends IAstSymbol {
    }

    /// Reference to some symbol (not definition/declaration)
    function AST_SymbolRef(props?: IAstSymbolRef): IAstSymbolRef;

    /// Reference to a label symbol
    interface IAstLabelRef extends IAstSymbol {
    }

    /// Reference to a label symbol
    function AST_LabelRef(props?: IAstLabelRef): IAstLabelRef;

    /// The `this` symbol
    interface IAstThis extends IAstSymbol {
    }

    /// The `this` symbol
    function AST_This(props?: IAstThis): IAstThis;

    /// Base class for all constants
    interface IAstConstant extends IAstNode {
    }

    /// Base class for all constants
    function AST_Constant(props?: IAstConstant): IAstConstant;

    /// A string literal
    interface IAstString extends IAstConstant {
        /// the contents of this string
        value?: string;
        /// the original quote character
        quote?: string;
    }

    /// A string literal
    function AST_String(props?: IAstString): IAstString;

    /// A number literal
    interface IAstNumber extends IAstConstant {
        /// the numeric value
        value?: number;
        /// numeric value as string (optional)
        literal?: string;
    }

    /// A number literal
    function AST_Number(props?: IAstNumber): IAstNumber;

    /// A regexp literal
    interface IAstRegExp extends IAstConstant {
        /// the actual regexp
        value?: RegExp;
    }

    /// A regexp literal
    function AST_RegExp(props?: IAstRegExp): IAstRegExp;

    /// Base class for atoms
    interface IAstAtom extends IAstConstant {
    }

    /// Base class for atoms
    function AST_Atom(props?: IAstAtom): IAstAtom;

    /// The `null` atom
    interface IAstNull extends IAstAtom {
    }

    /// The `null` atom
    function AST_Null(props?: IAstNull): IAstNull;

    /// The impossible value
    interface IAstNaN extends IAstAtom {
    }

    /// The impossible value
    function AST_NaN(props?: IAstNaN): IAstNaN;

    /// The `undefined` value
    interface IAstUndefined extends IAstAtom {
    }

    /// The `undefined` value
    function AST_Undefined(props?: IAstUndefined): IAstUndefined;

    /// A hole in an array
    interface IAstHole extends IAstAtom {
    }

    /// A hole in an array
    function AST_Hole(props?: IAstHole): IAstHole;

    /// The `Infinity` value
    interface IAstInfinity extends IAstAtom {
    }

    /// The `Infinity` value
    function AST_Infinity(props?: IAstInfinity): IAstInfinity;

    /// Base class for booleans
    interface IAstBoolean extends IAstAtom {
    }

    /// Base class for booleans
    function AST_Boolean(props?: IAstBoolean): IAstBoolean;

    /// The `false` atom
    interface IAstFalse extends IAstBoolean {
    }

    /// The `false` atom
    function AST_False(props?: IAstFalse): IAstFalse;

    /// The `true` atom
    interface IAstTrue extends IAstBoolean {
    }

    /// The `true` atom
    function AST_True(props?: IAstTrue): IAstTrue;


    interface IOutputStreamOptions {
        beautify?: boolean;
    }

    interface ICompressorOptions {
        global_defs?: { [name: string]: any };
    }

    interface IParseOptions {
        filename?: string;
        strict?: boolean;
        toplevel?: IAstToplevel;
    }

    interface IWalker {
        parent(n?: number): IAstNode;
        stack: IAstNode[];
        find_parent(type: any): IAstNode;
        in_boolean_context(): boolean;
    }

    interface ITransformer extends IWalker {
    }

    function parse(code: string, options?: IParseOptions): IAstToplevel;
    function OutputStream(options: IOutputStreamOptions): IOutputStream;
    function TreeWalker(visitor: (node: IAstNode, descend: () => void) => boolean): IWalker;
    function TreeTransformer(before: (node: IAstNode, descend: (node: IAstNode, walker: IWalker) => void) => IAstNode, after: (node: IAstNode) => IAstNode): ITransformer;
    function Compressor(options: ICompressorOptions): ITransformer;
}
