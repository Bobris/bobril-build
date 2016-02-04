import * as b from 'bobril';
import * as c from 'bobril-build-override-const-lib-sample';

let color = "#123456";
const icon = b.sprite("light.png", c.cstr);
const iconDynamicColor = b.sprite("light.png", () => color);

setInterval(() => {
    color = "#" + color.substr(2, 5) + color[1];
    b.invalidateStyles();
}, 1000);

let page = b.createVirtualComponent({
    render(ctx: any, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {

        me.children = [
            b.style({
                tag: 'div'
            }, icon),
            b.style({
                tag: 'div'
            }, iconDynamicColor),
            {
                tag: 'p',
                children: "cstr: " + c.cstr + " dyn color: " + color
            }
        ];
    }
});

b.init(() => page({}));
