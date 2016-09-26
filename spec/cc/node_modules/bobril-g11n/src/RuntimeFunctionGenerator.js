var RuntimeFunctionGenerator = (function () {
    function RuntimeFunctionGenerator() {
        this.constants = [];
        this.body = '';
        this.argCount = 0;
        this.localCount = 0;
    }
    RuntimeFunctionGenerator.prototype.addConstant = function (value) {
        var cc = this.constants;
        for (var i = 0; i < cc.length; i++) {
            if (cc[i] === value)
                return 'c_' + i;
        }
        cc.push(value);
        return 'c_' + (cc.length - 1);
    };
    RuntimeFunctionGenerator.prototype.addArg = function (index) {
        if (index >= this.argCount)
            this.argCount = index + 1;
        return 'a_' + index;
    };
    RuntimeFunctionGenerator.prototype.addBody = function (text) {
        this.body += text;
    };
    RuntimeFunctionGenerator.prototype.addLocal = function () {
        return 'l_' + (this.localCount++);
    };
    RuntimeFunctionGenerator.prototype.build = function () {
        var innerParams = [];
        for (var i = 0; i < this.argCount; i++) {
            innerParams.push('a_' + i);
        }
        if (this.constants.length > 0) {
            var params = [];
            for (var i = 0; i < this.constants.length; i++) {
                params.push('c_' + i);
            }
            params.push('return function(' + innerParams.join(',') + ') {\n' + this.body + '\n}');
            return Function.apply(null, params).apply(null, this.constants);
        }
        innerParams.push(this.body);
        return Function.apply(null, innerParams);
    };
    return RuntimeFunctionGenerator;
})();
exports.RuntimeFunctionGenerator = RuntimeFunctionGenerator;
