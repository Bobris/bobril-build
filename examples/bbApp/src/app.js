"use strict";
var b = require('bobril');
var g = require('bobril-g11n');
var lightSwitch_1 = require('./lightSwitch');
b.asset("bootstrap/css/bootstrap.css");
var headerStyle = b.styleDef({ backgroundColor: "green", padding: 10 }, undefined, "header");
var page = b.createVirtualComponent({
    init: function (ctx) {
        ctx.counter = 0;
        setInterval(function () { ctx.counter++; b.invalidate(); }, 1000);
    },
    render: function (ctx, me, _oldMe) {
        var m = g.getMoment();
        me.children = [
            b.style({ tag: 'h1', children: g.t('Hello World! {c, number}', { c: ctx.counter }) }, headerStyle),
            {
                tag: 'p',
                children: [
                    'See examples on ',
                    {
                        tag: 'a',
                        attrs: { href: 'https://github.com/Bobris/Bobril' },
                        children: g.t('Bobril GitHub pages')
                    }
                ]
            },
            {
                tag: 'img', attrs: { src: b.asset('light.png') }
            },
            lightSwitch_1.default({ value: false, onChange: function () { } }),
            {
                tag: 'span', className: "glyphicon glyphicon-star", attrs: { "ariaHidden": true }
            },
            {
                tag: 'p', children: "Current locale: " + g.getLocale()
            },
            {
                tag: 'p', children: "Moment long date format L: " + m.localeData().longDateFormat("L")
            },
            {
                tag: 'p',
                children: "cs-CZ",
                component: { onClick: function () { g.setLocale("cs-CZ"); return true; } }
            }
        ];
    }
});
b.init(function () { return page({}); });
