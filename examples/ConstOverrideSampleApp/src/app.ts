import * as b from 'bobril';
import * as c from 'bobril-build-override-const-lib-sample';

let page = b.createVirtualComponent({
    render(ctx: any, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {
        me.children = [
            {
                tag: 'p',
                children: "cbool: " + c.cbool
            },
            {
                tag: 'p',
                children: "cnum: " + c.cnum
            },
            {
                tag: 'p',
                children: "cstr: " + c.cstr
            }
        ];
    }
});

b.init(() => page({}));
