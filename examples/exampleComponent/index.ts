import * as b from 'bobril';

export interface IData {
    children?: b.IBobrilChildren;
    onAction?: () => void;
    style?: b.IBobrilStyle;
}

interface ICtx extends b.IBobrilCtx {
    data: IData;
}

export default b.createVirtualComponent<IData>({
    render(ctx: ICtx, me: b.IBobrilNode) {
        me.tag = 'button';
        me.children = ctx.data.children;
        b.style(me, ctx.data.style);
    },
    onClick(ctx: ICtx): boolean {
        let a = ctx.data.onAction;
        if (a) {
            a();
            return true;
        }
        return false;
    }
});
