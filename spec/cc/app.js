"use strict";
const b = require('bobril');
const bobril_g11n_1 = require('bobril-g11n');
bobril_g11n_1.initGlobalization({
    defaultLocale: 'cs-CZ',
    pathToTranslation: (locale) => { return locale + '.js'; }
});
const bobrilLogo = b.styleDef([{ display: 'inline-block' }, b.sprite('logo.png')]);
const header = b.createComponent({
    render(ctx, me) {
        me.children = [b.styledDiv('', bobrilLogo), ' ', ctx.data.children];
        b.style(me, { fontSize: ctx.data.fontSize });
    }
});
const warnStyle = b.styleDef({ background: "#ffc0c0" });
const warnHeader = b.createDerivedComponent(header, {
    render(ctx, me) {
        b.style(me, ctx.data.isWarning && warnStyle);
    }
});
setInterval(1000, () => {
    b.invalidate();
});
b.init(() => [
    header({ fontSize: 20 }, bobril_g11n_1.t('Hello')),
    warnHeader({ fontSize: 25, isWarning: true }, 'World'),
    header({ fontSize: 15 }, bobril_g11n_1.t('Right now is {now, date, LLLL}', { now: b.now() }))
]);
//# sourceMappingURL=app.js.map