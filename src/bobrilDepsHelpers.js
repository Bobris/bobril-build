var path = require('path');
var fs = require('fs');
var Promise = require("bluebird");
function systemJsPath() {
    return path.join(path.dirname(require.resolve('systemjs')), 'dist');
}
exports.systemJsPath = systemJsPath;
function systemJsFiles() {
    return ['system.js', 'system-polyfills.js'];
}
exports.systemJsFiles = systemJsFiles;
function numeralJsPath() {
    return path.dirname(require.resolve('numeral'));
}
exports.numeralJsPath = numeralJsPath;
function numeralJsFiles() {
    return ['numeral.js'];
}
exports.numeralJsFiles = numeralJsFiles;
function momentJsPath() {
    return path.dirname(require.resolve('moment'));
}
exports.momentJsPath = momentJsPath;
function momentJsFiles() {
    return ['moment.js'];
}
exports.momentJsFiles = momentJsFiles;
function systemJsBasedIndexHtml(mainRequire) {
    return "<html>\n    <head>\n        <meta charset=\"utf-8\">\n        <title>Bobril Application</title>\n    </head>\n    <body>\n        <script type=\"text/javascript\" src=\"system.js\" charset=\"utf-8\"></script>\n        <script type=\"text/javascript\">\n            System.config({\n                'baseURL': '/',\n                'defaultJSExtensions': true,\n            });\n            System.import('numeral.js');\n            System.import('moment.js');\n            System.import('" + mainRequire + "');\n        </script>\n    </body>\n</html>\n";
}
exports.systemJsBasedIndexHtml = systemJsBasedIndexHtml;
function writeDir(write, dir, files) {
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        write(f, fs.readFileSync(path.join(dir, f)));
    }
}
function writeSystemJsBasedDist(write, mainRequire) {
    var prom = Promise.resolve(null);
    write('index.html', new Buffer(systemJsBasedIndexHtml(mainRequire)));
    writeDir(write, systemJsPath(), systemJsFiles());
    writeDir(write, numeralJsPath(), numeralJsFiles());
    writeDir(write, momentJsPath(), momentJsFiles());
    return prom;
}
exports.writeSystemJsBasedDist = writeSystemJsBasedDist;
