import * as b from './node_modules/bobril/index';
import * as g from './node_modules/bobril-g11n/index';

g.initGlobalization({});

const bobrilLogo = b.styleDef([{ display: 'inline-block' }, b.sprite('logo.png')]);

interface IHeaderData {
	fontSize: number;
    children?: b.IBobrilChildren;
}

interface IHeaderCtx extends b.IBobrilCtx {
	data: IHeaderData;
}

const header = b.createComponent({
	render(ctx: IHeaderCtx, me: b.IBobrilNode) {
		me.children = [ b.styledDiv('', bobrilLogo), ' ', ctx.data.children ];
		b.style(me, { fontSize: ctx.data.fontSize });
	}
});

interface IWarnHeaderData extends IHeaderData {
	isWarning?: boolean;
}

interface IWarnHeaderCtx extends b.IBobrilCtx {
	data: IWarnHeaderData;
}

const warnStyle = b.styleDef({ background: "#ffc0c0" });

const warnHeader = b.createDerivedComponent<IWarnHeaderData>(header, {
	render(ctx: IWarnHeaderCtx, me: b.IBobrilNode) {
		b.style(me, ctx.data.isWarning && warnStyle);
	}
});

setInterval(1000, ()=> {
	b.invalidate();
});

b.init(() => [
    header({ fontSize: 20 }, g.t('Hello')),
	warnHeader({ fontSize: 25, isWarning: true }, 'World'),
	header({ fontSize: 15 }, g.t('Right now is {now, date, LLLL}', { now: b.now() }))
]);
