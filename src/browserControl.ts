var web = require('browser_process');
var rdbg = require('rdbg');
var temp = require('temp');
var net = require('net');
require('bluebird');

export interface IBrowserControl {
	start(port: number, command: string, url: string): Promise<any>;
	setScriptSource(scriptId:string, content:string): Promise<any>;
	listScriptUrls():string[];
	getScriptIdFromUrl(url:string):string;
	evaluate(script:string): Promise<any>;
}

export class BrowserControl implements IBrowserControl {
	constructor() {
		let that = this;
		this._scripts = [];
		this._client = rdbg.createClient();
		this._client.on('close', () => {
			console.log('debugger disconnected');
		});
		this._client.on('connect', () => {

			this._client.debugger.on('clear', function() {
				that._scripts = [];
			});

			this._client.debugger.on('scriptParse', function(script) {
				if (script.url!="") {
					that._scripts.push(script);
				}
			});
			this._client.debugger.enable(()=>{
				console.log('debugger enabled');
			});
		});
		//this._client.on('ready', () => {
		//	console.log('ready');
		//});
	}

	private _target: any;
	private _client: any;
	private _scripts: any[];
	start(port: number, command: string, url: string): Promise<any> {
		let that = this;
		return new Promise((resolve, reject) => {
			let options = {};
			let args = [];
			args.unshift('--no-first-run', '--no-default-browser-check');
			var dirname = temp.path(command);
			args.unshift.apply(args, web.options(command, {
				profile: dirname,
				url: url,
				debug: port,
			}));

			console.log(`spawn`, command, args.join(' '));
			web.spawn(command, args, options, function(error, browser) {
				if (error) {
					console.log('bail', error.description);
					reject(error);
					return;
				}

				console.log('find %s', url);
				setTimeout(function find(retry) {
					rdbg.get(port, 'localhost', (error, targets) => {
						if (error) {
							targets = [];
						}

						var matches = targets.filter(function(target) {
							return url === target.url.substr(0, url.length);
						});

						if (matches.length > 0) {
							console.log('start connect');
							that._target = matches[0];
							that._client.connect(that._target);
							resolve();
							return;
						} else if (retry) {
							setTimeout(find, 1000, retry--);
							return;
						}

						if (error === undefined) {
							error = new Error('Cannot find browser tab \'' + url + '\'');
						}

						console.log('find error', error);
						reject(error);
					});
				}, 1000, 120);
			});
		});
	}
	
	getScriptIdFromUrl(url:string):string {
		return this._scripts.find((i)=>i.url===url).scriptId;
	}
	
	listScriptUrls():string[] {
		return this._scripts.map((i)=>i.url);
	}
	
	setScriptSource(scriptId:string, content:string): Promise<any> {
		return new Promise((resolve, reject)=>{
			this._client.debugger.setScriptSource(scriptId, content, (err)=>{
				if (err) {
					reject(err);
				}
				resolve();
			});
		});
	}
	
	evaluate(script:string): Promise<any> {
		return new Promise((resolve, reject)=>{
			this._client.runtime.evaluate(script,(err)=>{
				if (err) reject(err);
				resolve();
			});
		});
	}
}
