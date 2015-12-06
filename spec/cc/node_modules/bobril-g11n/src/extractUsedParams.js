function extractUsedParams(msgAst) {
    var params = Object.create(null);
    extractUsedParamsRec(params, msgAst);
    return Object.keys(params).sort();
}
exports.extractUsedParams = extractUsedParams;
function extractUsedParamsRec(usedParams, msgAst) {
    if (typeof msgAst === 'string') {
        return;
    }
    if (Array.isArray(msgAst)) {
        for (var i = 0; i < msgAst.length; i++) {
            var item = msgAst[i];
            extractUsedParamsRec(usedParams, item);
        }
        return;
    }
    switch (msgAst.type) {
        case 'arg':
            usedParams[msgAst.id] = true;
            return;
        case 'hash':
            return;
        case 'format':
            usedParams[msgAst.id] = true;
            var type = msgAst.format.type;
            switch (type) {
                case 'plural':
                case 'select':
                    {
                        var options = msgAst.format.options;
                        for (var i = 0; i < options.length; i++) {
                            var opt = options[i];
                            extractUsedParamsRec(usedParams, opt.value);
                        }
                        break;
                    }
                case 'number':
                case 'date':
                case 'time':
                    {
                        var style = msgAst.format.style || 'default';
                        var options = msgAst.format.options;
                        if (options) {
                            for (var i = 0; i < options.length; i++) {
                                if (typeof options[i].value === 'object') {
                                    extractUsedParamsRec(usedParams, options[i].value);
                                }
                            }
                        }
                    }
            }
            return;
    }
}
