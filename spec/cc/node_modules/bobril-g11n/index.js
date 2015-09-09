function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require('./src/msgFormatParser'));
__export(require('./src/msgFormatter'));
__export(require('./src/jsonp'));
__export(require('./src/localeDataStorage'));
__export(require('./src/translate'));
require('numeral');
window.moment = require('moment');
