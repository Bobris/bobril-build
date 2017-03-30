"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const postcss = require("postcss");
const postcssUrl = require("postcss-url");
const cssnano = require("cssnano");
function processCss(source, from, callback) {
    return postcss([postcssUrl({
            url: (oldUrl, decl, from, dirname, to, options, result) => {
                if (oldUrl.startsWith("data:"))
                    return oldUrl;
                return callback(oldUrl, from);
            }
        })]).process(source, { from });
}
exports.processCss = processCss;
function concatenateCssAndMinify(inputs, callback) {
    return Promise.all(inputs.map((i) => {
        return processCss(i.source, i.from, callback);
    })).then(results => {
        let r = results[0].root;
        for (let i = 1; i < results.length; i++) {
            r = r.append(results[i].root);
        }
        return postcss([cssnano({ safe: true })]).process(r.toResult());
    });
}
exports.concatenateCssAndMinify = concatenateCssAndMinify;
//# sourceMappingURL=cssHelpers.js.map