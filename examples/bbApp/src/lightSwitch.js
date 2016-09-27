"use strict";
var b = require('bobril');
var iconShine = b.sprite("light.png", "#80ff80");
var iconOff = b.sprite("light.png", "#e03030");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = b.createComponent({
    render: function (ctx, me) {
        b.style(me, ctx.data.value ? iconShine : iconOff);
    },
    onClick: function (ctx) {
        ctx.data.onChange(!ctx.data.value);
        return true;
    }
});
