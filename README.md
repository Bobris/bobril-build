# bobril-build
Helper tool to build Bobril applications
Mainly it will support copying sprites, building big sprites. support i18n. All this during optimal TypeScript compilation.

How to use:

	npm install bobril-build -g
	
Then create package.json with typescript.main or name your main ts file as index.ts or app.ts and start:

	bb
	
This will start bobril build in interactive mode. It will watch changes of your application, recompile and host in on http://localhost:8080. It uses latest Typescript to compile and prefer Node moduleResolution. Compilation for maximum speed enables skipDefaultLibCheck.

There is also command line single build option. Start to learn all options:

	bb -h

For development of bobril-build check out this project and start:

	npm link
	gulp

It reads `package.json` and understands:

	{
		"typescript": {
			"main": "pathToMain.ts"
		},
		"bobril": {
			"dir": "name of directory where to place release default is dist",
			"resourcesAreRelativeToProjectDir": false, // this is default
			"example": "pathToExample.ts", // sample application entry point - if main is index.ts than example.ts is searched for default
			"title": "index.html Title",
			"constantOverrides": {
				"module_name": {
					"export_name": "New value, it supports also number and boolean values"
				}
			}
		}
	}
	
It is currently not selfhosting but it will come...
