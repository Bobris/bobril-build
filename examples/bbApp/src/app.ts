import * as b from 'bobril';
import * as g from 'bobril-g11n';
import lightSwitch from './lightSwitch';

interface IPageCtx extends b.IBobrilCtx {
    counter: number;
}

b.asset("bootstrap/css/bootstrap.css");

let headerStyle = b.styleDef({ backgroundColor: "green", padding: 10 }, undefined, "header");

let page = b.createVirtualComponent({
    init(ctx: IPageCtx) {
        ctx.counter = 0;
        setInterval(() => { ctx.counter++; b.invalidate(); }, 1000);
    },
    render(ctx: IPageCtx, me: b.IBobrilNode, _oldMe?: b.IBobrilCacheNode): void {
        let m = g.getMoment();

        me.children = [
            b.style({ tag: 'h1', children: g.t('Hello World! {c, number}', { c: ctx.counter }) }, headerStyle),
            {
                tag: 'p',
                children: [
                    'See examples on ',
                    {
                        tag: 'a',
                        attrs: { href: 'https://github.com/Bobris/Bobril' },
                        children: g.t('Bobril GitHub pages')
                    }
                ]
            },
            {
                tag: 'img', attrs: { src: b.asset('light.png') }
            },
            lightSwitch({ value: false, onChange: () => { } }),
            {
                tag: 'span', className: "glyphicon glyphicon-star", attrs: { "ariaHidden": true }
            },
            {
                tag: 'p', children: "Current locale: " + g.getLocale()
            },
            {
                tag: 'p', children: "Moment long date format L: " + (<any>m.localeData()).longDateFormat("L")
            },
            {
                tag: 'p',
                children: "cs-CZ",
                component: { onClick: () => { g.setLocale("cs-CZ"); return true; } }
            }
        ];
    }
});

b.init(() => page({}));
