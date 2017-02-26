"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function debounce(func, wait = 100, immediate) {
    var timeout, args, context, timestamp, result;
    function later() {
        let last = Date.now() - timestamp;
        if (last < wait && last > 0) {
            timeout = setTimeout(later, wait - last);
        }
        else {
            timeout = null;
            if (!immediate) {
                result = func.apply(context, args);
                if (!timeout)
                    context = args = null;
            }
        }
    }
    ;
    return function debounced() {
        context = this;
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && !timeout;
        if (!timeout)
            timeout = setTimeout(later, wait);
        if (callNow) {
            result = func.apply(context, args);
            context = args = null;
        }
        return result;
    };
}
exports.debounce = debounce;
;
//# sourceMappingURL=debounce.js.map