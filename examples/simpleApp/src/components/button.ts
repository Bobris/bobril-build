import * as b from 'node_modules/bobril/index';

interface IData {
    title: string;
    onClick: () => void;
}

interface ICtx extends b.IBobrilCtx {
    data: IData;
}

export let create = b.createComponent<IData>({
    render(ctx: ICtx, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {
        me.tag = 'button';
        me.attrs = { type: 'button' };
        me.children = ctx.data.title;
    },
    onClick(ctx: ICtx, ev: b.IBobrilMouseEvent): boolean {
        ctx.data.onClick();
        return true;
    }
});
