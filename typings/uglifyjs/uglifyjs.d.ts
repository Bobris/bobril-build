declare module "uglifyjs" {
    interface IOutputStream {
        toString(): string;
    }

    interface ITopLevel {
        print(os: IOutputStream);
    }

    interface IOutputStreamOptions {
        beautify?: boolean;
    }

    function parse(code: string): ITopLevel;
    function OutputStream(options: IOutputStreamOptions): IOutputStream;
}
