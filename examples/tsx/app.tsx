import * as b from "bobril";

interface IData {
    children?: b.IBobrilChildren;
    onAction?: () => void;
    style?: b.IBobrilStyle;
}

interface ICtx extends b.IBobrilCtx {
    data: IData;
}

const Button = b.createVirtualComponent<IData>({
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

const buttonStyle = b.styleDef(
    {
        fontSize: "2em",
        transition: "all 0.5s"
    },
    {
        "hover":
        {
            background: "#8ca"
        }
    }
);

let counter = 0;
b.init(() => <div>
    <h1>Tsx sample</h1>
    <p>Jsx in bobril is good fast prototyping.Do not use it in performance critical code for now.</p>
    <Button style={buttonStyle} onAction={() => { counter++; b.invalidate() } }>
        Click to increment {counter}
    </Button>
</div >);
