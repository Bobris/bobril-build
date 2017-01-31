import * as b from 'bobril';

export const mainPage = b.createVirtualComponent({
    render(_ctx: b.IBobrilCtx, me: b.IBobrilNode): void {
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
