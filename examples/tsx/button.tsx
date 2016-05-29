import * as b from 'bobril';

export interface IData {
    children?: b.IBobrilChildren;
    onAction?: () => void;
    style?: b.IBobrilStyle;
}

interface ICtx extends b.IBobrilCtx {
    data: IData;
}

export const Button = b.createVirtualComponent<IData>({
    render(ctx: ICtx, me: b.IBobrilNode) {
        me.children = <button style={ctx.data.style}>{ctx.data.children}</button>;
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
