define(["require", "exports", 'node_modules/bobril/index'], function (require, exports, b) {
    exports.page = b.createComponent({
        render: function (ctx, me, oldMe) {
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
});
