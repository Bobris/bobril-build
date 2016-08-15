export function globalDefines(defines: { [name: string]: any }): string {
    let res = "";
    if (defines == null) return res;
    let dns = Object.keys(defines);
    for (let i = 0; i < dns.length; i++) {
        res += "var " + dns[i] + " = " + JSON.stringify(defines[dns[i]]) + ";\n";
    }
    return res;
}

export function removeLinkToSourceMap(content: Buffer): Buffer {
    let pos = content.length - 3;
    while (pos >= 0) {
        if (content[pos] === 10) break;
        pos--;
    }
    if (pos < content.length - 5) {
        if (content.slice(pos + 1, pos + 4).toString() === "//#")
            return content.slice(0,pos);
    }
    return content;
}

export function getUserHome() {
    return process.env.HOME || process.env.USERPROFILE;
}

export function isWin() {
    return process.platform === 'win32';
}
