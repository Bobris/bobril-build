# bobril-build
Helper tool to build Bobril applications
Mainly it will support copying sprites, building big sprites. support i18n. All this during optimal TypeScript compilation.

How to use:

	npm install bobril-build -g
	
Then create package.json with typescript.main or name your main ts file as index.ts or app.ts and start:

	bb
	
It will watch changes of your application, recompile and host in on http://localhost:8080. It uses latest Typescript to compile and prefer Node moduleResolution. Compilation for maximum speed enables skipDefaultLibCheck.

For development of bobril-build check out this project and start:

	npm link
	gulp

It is currently not selfhosting but it will come...
