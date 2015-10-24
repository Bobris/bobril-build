import * as b from 'bobril';
import * as g from 'bobril-g11n';
import lightSwitch from './lightSwitch';
import lightSwitch2 from './lightSwitch2';

var v1 = false;

g.initGlobalization({});

let counter = 0;

setInterval(() => { counter++; b.invalidate(); }, 1000);

let mystyle = b.styleDef(() => [{ backgroundColor: 'blue' }]);

let page = b.createComponent({
    render(ctx: b.IBobrilCtx, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {
        me.children = [
            b.style({ tag: 'h1', children: 'Hello World! ' + counter }, mystyle),
            lightSwitch({
                value: v1,
                onChange: (v) => {
                    v1 = v; b.invalidate();
                }
            }),
            lightSwitch2({
                value: v1,
                onChange: (v) => {
                    v1 = v; b.invalidate();
                }
            }),
            {
                tag: 'p',
                children: [
                    'See examples on ',
                    {
                        tag: 'a',
                        attrs: { href: 'https://github.com/Bobris/Bobril' },
                        children: 'Bobril GitHub pages'
                    },
                    g.t('! {d, date, LLLL}', { d: b.now() })
                ]
            }
        ];
    }
});

b.init(() => page({}));
