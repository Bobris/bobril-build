"use strict";
var postcss = require('postcss');
var postcssUrl = require('postcss-url');
function processCss(source, from, callback) {
    return postcss([postcssUrl({ url: function (oldUrl, decl, from, dirname, to, options, result) {
                return callback(oldUrl, from);
            } })]).process(source, { from: from });
}
exports.processCss = processCss;
