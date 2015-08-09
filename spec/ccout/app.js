var b = require('./node_modules/bobril/index');
var g = require('./node_modules/bobril-g11n/index');
g.initGlobalization({});
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
setInterval(1000, function () {
    b.invalidate();
});
b.init(function () { return [
    header({ fontSize: 20 }, g.t('Hello')),
    warnHeader({ fontSize: 25, isWarning: true }, 'World'),
    header({ fontSize: 15 }, g.t('Right now is {now, date, LLLL}', { now: b.now() }))
]; });
