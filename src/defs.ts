export interface CompilationResultMessage {
    fileName: string;
    isError: boolean;
    text: string;
    /// startLine, startCol, endLine, endCol all one based
    pos: [number, number, number, number];
}
