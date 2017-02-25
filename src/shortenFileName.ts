import * as pathPlatformDependent from "path";
const path = pathPlatformDependent.posix; // This works everywhere, just use forward slashes

function numberToChars(n: number) {
    let res = "";
    do {
        let rem = n % 26;
        res += String.fromCharCode(97 + rem);
        n = ((n / 26) | 0) - 1;
    } while (n >= 0);
    return res;
}

export function createFileNameShortener(): (fn: string) => string {
    let map: { [fn: string]: string } = Object.create(null);
    let extToCount: { [ext: string]: number } = Object.create(null);
    return (fn: string) => {
        let res = map[fn];
        if (res !== undefined) return res;
        let ext = path.extname(fn);
        let extc = extToCount[ext];
        if (extc === undefined) {
            extc = 0;
        }
        extToCount[ext] = extc + 1;
        res = numberToChars(extc) + ext;
        map[fn] = res;
        return res;
    };
}
