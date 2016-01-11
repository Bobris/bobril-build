declare module "error-stack-parser" {
    import { StackFrame } from 'stackframe';

    function parse(error: { stack: string }): StackFrame[];
}
