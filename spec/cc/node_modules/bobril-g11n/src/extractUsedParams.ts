export function extractUsedParams(msgAst: any): string[] {
	let params = Object.create(null);
	extractUsedParamsRec(params, msgAst);
    return Object.keys(params).sort();
}

function extractUsedParamsRec(usedParams: { [name:string]:boolean }, msgAst: any) {
    if (typeof msgAst === 'string') {
        return;
    }
    if (Array.isArray(msgAst)) {
        for (let i = 0; i < msgAst.length; i++) {
            let item = msgAst[i];
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
            let type = msgAst.format.type;
            switch (type) {
                case 'plural':
                case 'select':
                    {
                        let options = msgAst.format.options;
                        for (let i = 0; i < options.length; i++) {
                            let opt = options[i];
                            extractUsedParamsRec(usedParams, opt.value);
                        }
                        break;
                    }
                case 'number':
                case 'date':
                case 'time':
                    {
                        let style = msgAst.format.style || 'default';
                        let options = msgAst.format.options;
                        if (options) {
							for (let i = 0; i < options.length; i++) {
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
