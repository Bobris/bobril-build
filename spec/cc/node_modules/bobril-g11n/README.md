# bobril-g11n

Bobril Globalization extension

install from npm:

	npm install bobril-g11n --save

It is expected to be used together with bobril-build to handle all code and translation generation.
Internally uses moment.js, numeral.js, CLDR. Inspired by formatjs.io.
Uses very similar message format. Though I was not satisfied with Intl polyfill.
Message parse for speed and size written in hand optimized code instead of Pegjs.

Usage in TypeScript:

	import * as b from 'node_modules/bobril/index';
	import * as g from 'node_modules/bobril-g11n/index';
	
	g.initGlobalization({
		pathToTranslation(locale:string):string { return 'tr/'+locale+'.js'; }
	});
	
	b.init(()=>{
		return { tag:'div', children: g.t('Hello {who}!', { who: 'World' }) };
	});

Set different locale - it will asynchronously download translation file.

	g.setLocale('cs-CZ');

This is one of examples how to make really human readable messages:

	g.t('{numPhotos, plural, =0{no photos} =1{one photo} other{# photos}}', { numPhotos: 1 });
