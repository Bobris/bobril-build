import * as b from '../node_modules/bobril/index';

export let page = b.createComponent({
    render(ctx: b.IBobrilCtx, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {
        me.children = [
            { tag: 'h1', children: 'Hello World!' },
            {
                tag: 'p',
                children: [
                    'See examples on ',
                    {
                        tag: 'a',
                        attrs: { href: 'https://github.com/Bobris/Bobril' },
                        children: 'Bobril GitHub pages.'
                    }
                ]
            }
        ];
    }
});
