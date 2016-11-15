import * as b from 'bobril';
import * as g from 'bobril-g11n';

export const mainPage = b.createComponent({
    render(_ctx: b.IBobrilCtx, me: b.IBobrilNode): void {
        me.children = [
            { tag: 'h1', children: g.t('Hello World!') },
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
