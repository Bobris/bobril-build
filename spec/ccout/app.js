var b = require('node_modules/bobril/index');
var bobrilLogo = b.styleDef([{ display: 'inline-block' }, b.spriteb(160, 160, 0, 0)], null, "bobrilLogo");
var header = b.createComponent({
    render: function (ctx, me) {
        me.children = [b.styledDiv('', bobrilLogo), ' ', ctx.data.children];
        b.style(me, { fontSize: ctx.data.fontSize });
    }
});
var warnStyle = b.styleDef({ background: "#ffc0c0" }, null, "warnStyle");
var warnHeader = b.createDerivedComponent(header, {
    render: function (ctx, me) {
        b.style(me, ctx.data.isWarning && warnStyle);
    }
});
var lightSprite = b.spriteb(40, 40, 160, 40);
var lightSpriteGreen = b.spriteb(40, 40, 160, 0);
b.init(function () { return [
    header({ fontSize: 20 }, 'Hello'),
    warnHeader({ fontSize: 25, isWarning: true }, 'World'),
    b.styledDiv('', lightSprite), b.styledDiv('', lightSpriteGreen)
]; });
