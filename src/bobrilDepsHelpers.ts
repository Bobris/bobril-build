import * as path from 'path';
import * as fs from 'fs';
import * as Promise from "bluebird";

export function systemJsPath(): string {
    return path.join(path.dirname(require.resolve('systemjs')), 'dist');
}

export function systemJsFiles(): string[] {
    return ['system.js', 'system-polyfills.js'];
}

export function numeralJsPath(): string {
    return path.dirname(require.resolve('numeral'));
}

export function numeralJsFiles(): string[] {
    return ['numeral.js'];
}

export function momentJsPath(): string {
    return path.dirname(require.resolve('moment'));
}

export function momentJsFiles(): string[] {
    return ['moment.js'];
}

export function systemJsBasedIndexHtml(mainRequire: string) {
    return `<html>
    <head>
        <meta charset="utf-8">
        <title>Bobril Application</title>
    </head>
    <body>
        <script type="text/javascript" src="system.js" charset="utf-8"></script>
        <script type="text/javascript">
            System.config({
                'baseURL': '/',
                'defaultJSExtensions': true,
            });
            System.import('numeral.js');
            System.import('moment.js');
            System.import('${mainRequire}');
        </script>
    </body>
</html>
`;
}

function writeDir(write: (fn: string, b: Buffer) => void, dir: string, files: string[]) {
    for (let i = 0; i < files.length; i++) {
        let f = files[i];
        write(f, fs.readFileSync(path.join(dir, f)));
    }
}

export function writeSystemJsBasedDist(write: (fn: string, b: Buffer) => void, mainRequire: string): Promise<any> {
    let prom = Promise.resolve(null);
    write('index.html', new Buffer(systemJsBasedIndexHtml(mainRequire)));
    writeDir(write, systemJsPath(), systemJsFiles());
    writeDir(write, numeralJsPath(), numeralJsFiles());
    writeDir(write, momentJsPath(), momentJsFiles());
    return prom;
}
