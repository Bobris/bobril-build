import * as b from 'bobril';
import * as c from 'bobril-build-override-const-lib-sample';

const icon = b.sprite("light.png", c.cstr);

let page = b.createVirtualComponent({
    render(ctx: any, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {
        me.children = [
            b.style({
                tag: 'div'
            }, icon),
            {
                tag: 'p',
                children: "cstr: " + c.cstr
            }
        ];
    }
});

b.init(() => page({}));
