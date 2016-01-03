import * as b from 'bobril';
import * as tag from 'bobrilstrap-tag';

export interface IData extends tag.IData {
}

interface ICtx extends b.IBobrilCtx {
    data: IData;
}

export default b.createDerivedComponent<IData>(tag.default, {
    render(ctx: ICtx, me: b.IBobrilNode) {               
        me.className = (me.className || '') + ' row'; 
    }
});
