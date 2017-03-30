export interface CompilationResultMessage {
    fileName: string;
    isError: boolean;
    text: string;
    pos: [number, number, number, number];
}
