/// <reference path="../node_modules/@types/cordova-plugin-device/index.d.ts" />
/// <reference path="../node_modules/@types/cordova/index.d.ts" />
import * as b from 'bobril';

document.addEventListener(
    'deviceready',
    () => b.init(() => [
        { tag: 'h1', children: 'Hello Bobril in Cordova!' },
        { tag: 'button', children: 'Click Me!', component: { onClick: () => alert(`Native dialog in ${device.platform}.`) } }
    ]),
    false
);