var R = ((name, fn) => {
    R.m[name.toLowerCase()] = { fn, exports: undefined };
});
R.m = Object.create(null);
R.r = (name, parent) => {
    let p = R.map[name];
    if (p == null)
        p = name;
    if (p[0] === '.') {
        var parts = parent ? parent.split("/") : [];
        parts.push('..');
        parts = parts.concat(p.split("/"));
        var newParts = [];
        for (let i = 0, l = parts.length; i < l; i++) {
            var part = parts[i];
            if (!part || part === ".")
                continue;
            if (part === "..")
                newParts.pop();
            else
                newParts.push(part);
        }
        p = newParts.join("/");
    }
    let m = R.m[p.toLowerCase()];
    if (m == null)
        throw new Error("Module " + name + " in " + (parent || "/") + " not registered");
    if (m.exports !== undefined)
        return m.exports;
    m.exports = {};
    m.fn.call(window, (name) => R.r(name, p), m, m.exports, window);
    return m.exports;
};
