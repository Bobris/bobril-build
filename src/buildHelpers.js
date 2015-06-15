var ts = require("typescript");
var evalNode = require("./evalNode");
function gatherSourceInfo(source, tc) {
    var result = { sprites: [] };
    function visit(n) {
        if (n.kind === 157 /* CallExpression */) {
            var ce = n;
            if (ce.expression.getText() === "b.sprite") {
                var si = { callExpression: ce };
                for (var i = 0; i < ce.arguments.length; i++) {
                    var res = evalNode.evalNode(ce.arguments[i], tc, i === 0); // first argument is path
                    if (res !== undefined)
                        switch (i) {
                            case 0:
                                if (typeof res === "string")
                                    si.name = res;
                                break;
                            case 1:
                                if (typeof res === "string")
                                    si.color = res;
                                break;
                            case 2:
                                if (typeof res === "number")
                                    si.width = res;
                                break;
                            case 3:
                                if (typeof res === "number")
                                    si.height = res;
                                break;
                            case 4:
                                if (typeof res === "number")
                                    si.x = res;
                                break;
                            case 5:
                                if (typeof res === "number")
                                    si.y = res;
                                break;
                            default: throw new Error("b.sprite cannot have more than 6 parameters");
                        }
                }
                result.sprites.push(si);
            }
        }
        ts.forEachChild(n, visit);
    }
    visit(source);
    return result;
}
exports.gatherSourceInfo = gatherSourceInfo;
function createNodeFromValue(value) {
    if (value === null) {
        var nullNode = ts.createNode(89 /* NullKeyword */);
        nullNode.pos = -1;
        return nullNode;
    }
    if (value === true) {
        var result = ts.createNode(95 /* TrueKeyword */);
        result.pos = -1;
        return result;
    }
    if (value === false) {
        var result = ts.createNode(80 /* FalseKeyword */);
        result.pos = -1;
        return result;
    }
    if (typeof value === "string") {
        var result = ts.createNode(8 /* StringLiteral */);
        result.pos = -1;
        result.text = value;
        return result;
    }
    if (typeof value === "number") {
        var result = ts.createNode(7 /* NumericLiteral */);
        result.pos = -1;
        result.text = "" + value;
        return result;
    }
    throw new Error("Don't know how to create node for " + value);
}
function setArgument(callExpression, index, value) {
    while (callExpression.arguments.length < index) {
        callExpression.arguments.push(createNodeFromValue(null));
    }
    if (callExpression.arguments.length === index) {
        callExpression.arguments.push(createNodeFromValue(value));
    }
    else {
        callExpression.arguments[index] = createNodeFromValue(value);
    }
}
exports.setArgument = setArgument;
