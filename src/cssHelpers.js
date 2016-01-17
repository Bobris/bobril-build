"use strict";
var postcss = require('postcss');
var postcssUrl = require('postcss-url');
var cssnano = require('cssnano');
function processCss(source, from, callback) {
    return postcss([postcssUrl({ url: function (oldUrl, decl, from, dirname, to, options, result) {
                return callback(oldUrl, from);
            } })]).process(source, { from: from });
}
exports.processCss = processCss;
function concatenateCssAndMinify(inputs, callback) {
    return Promise.all(inputs.map(function (i) {
        return processCss(i.source, i.from, callback);
    })).then(function (results) {
        var r = results[0].root;
        for (var i = 1; i < results.length; i++) {
            r = r.append(results[i].root);
        }
        return postcss([cssnano({ safe: true })]).process(r.toResult());
    });
}
exports.concatenateCssAndMinify = concatenateCssAndMinify;
