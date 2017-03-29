"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function deepEqual(a, b) {
    if (a === b) {
        return true;
    }
    else if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }
    else if (a == null || b == null || typeof a != 'object' || typeof b != 'object') {
        return false;
    }
    else {
        if (Buffer.isBuffer(a)) {
            if (!Buffer.isBuffer(b)) {
                return false;
            }
            if (a.length !== b.length)
                return false;
            for (let i = 0; i < a.length; i++) {
                if (a[i] !== b[i])
                    return false;
            }
            return true;
        }
        if (a.prototype !== b.prototype) {
            return false;
        }
        let ka = Object.keys(a);
        let kb = Object.keys(b);
        if (ka.length != kb.length) {
            return false;
        }
        ka.sort();
        kb.sort();
        for (let i = ka.length - 1; i >= 0; i--) {
            if (ka[i] != kb[i]) {
                return false;
            }
        }
        for (let i = ka.length - 1; i >= 0; i--) {
            let key = ka[i];
            if (!deepEqual(a[key], b[key])) {
                return false;
            }
        }
        return true;
    }
}
exports.deepEqual = deepEqual;
//# sourceMappingURL=deepEqual.js.map