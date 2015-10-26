import * as b from 'bobril';

interface IPageCtx extends b.IBobrilCtx {
    counter: number;
}

let headerStyle = b.styleDef({ backgroundColor: 'green', padding: 15 });

let page = b.createVirtualComponent({
    init(ctx: IPageCtx) {
        ctx.counter = 0;
        setInterval(() => { ctx.counter++; b.invalidate(); }, 1000);        
    },
    render(ctx: IPageCtx, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {
        me.children = [
            { tag: 'h1', children: 'Hello World! ' + ctx.counter },
            {
                tag: 'p',
                children: [
                    'See examples on ',
                    {
                        tag: 'a',
                        attrs: { href: 'https://github.com/Bobris/Bobril' },
                        children: 'Bobril GitHub pages'
                    }
                ]
            }
        ];
    }
});

b.init(() => page({}));
