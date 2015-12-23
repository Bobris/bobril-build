export function globalDefines(defines: { [name: string]: any }): string {
    let res = "";
    if (defines == null) return res;
    let dns = Object.keys(defines);
    for (let i = 0; i < dns.length; i++) {
        res += "var " + dns[i] + " = " + JSON.stringify(defines[dns[i]]) + ";\n";
    }
    return res;
}
