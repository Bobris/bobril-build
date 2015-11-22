import * as b from 'node_modules/bobril/index';

interface IData {
    value: string;
    onChange: (newValue: string) => void;
}

interface ICtx extends b.IBobrilCtx {
    data: IData;
}

export let create = b.createComponent<IData>({
    render(ctx: ICtx, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {
        me.tag = 'input';
        me.attrs = { type: 'text', value: ctx.data.value };
    },
    onChange(ctx: ICtx, newValue: string): void {
        ctx.data.onChange(newValue);
    }
});
