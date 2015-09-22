function debounce(func, wait, immediate) {
    if (wait === void 0) { wait = 100; }
    var timeout, args, context, timestamp, result;
    function later() {
        var last = Date.now() - timestamp;
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
