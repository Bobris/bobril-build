import * as b from 'bobril';
import * as g from 'bobril-g11n';


interface IPageCtx extends b.IBobrilCtx {
    counter: number;
}

let headerStyle = b.styleDef({ backgroundColor: "green", padding: 10 });

let page = b.createVirtualComponent({
    init(ctx: IPageCtx) {
        ctx.counter = 0;
        setInterval(() => { ctx.counter++; b.invalidate(); }, 1000);
    },
    render(ctx: IPageCtx, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {
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
				tag: 'p',
				children: "cs-CZ",
				component: { onClick: ()=> g.setLocale("cs-CZ") }
			}
        ];
    }
});

b.init(() => page({}));
