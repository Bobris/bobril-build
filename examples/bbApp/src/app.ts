import * as b from 'bobril';
import lightSwitch from './lightSwitch';
import lightSwitch2 from './lightSwitch2';

var v1 = false;

let page = b.createComponent({
    render(ctx: b.IBobrilCtx, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {
        me.children = [
            { tag: 'h1', children: 'Hello World!' },
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
					'!'
                ]
            }
        ];
    }
});

b.init(()=>page({}));
