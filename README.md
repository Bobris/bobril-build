# bobril-build

Helper tool to build Bobril applications
Mainly it will support copying sprites, building big sprites. support i18n. All this during optimal TypeScript compilation.

This bobril-build implementation was relaced by bobril-build-core in C# for faster bundling.

All future development is happening here: https://github.com/bobril/bbcore

How to use:

    npm install bobril-build -g

Then create package.json with typescript.main or name your main ts file as index.ts or app.ts and start:

    bb

This will start bobril build in interactive mode. It will watch changes of your application, recompile and host in on http://localhost:8080.
It uses latest Typescript to compile and prefer Node moduleResolution. Compilation for maximum speed enables skipDefaultLibCheck.

In interactive mode it also starts chrome headless and runs tests. Results could be seen on http://localhost:8080/bb.
To start another testing agent point any browser to http://localhost:8080/bb/test.
If you want to debug tests open http://localhost:8080/test.html, any failed asserts throws expections so it is easy to stop on them.

There is also command line single build option. Start to learn all options:

    bb -h

Use bobril.asset(path) to include asset to compilation. _.css files are automatically linked in index.html head. _.js files are automatically prepended to bundle.js.

Jenkins integration (in memory compile, run tests in Chrome Headless, write result in JUnit xml format):

    bb test -o junitTestResult.xml

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
            "interactiveToDisk": false, // write output of interactive mode do "dir" directory
            "compilerOptions": {
                "noImplicitAny": true,
                "noImplicitThis": true,
                "noUnusedLocals": true,
                "noUnusedParameters": true,
                "noImplicitReturns": true,
                "noFallthroughCasesInSwitch": true,
                "strictNullChecks": true,
                "declaration": true,
            },
            "prefixStyleDefs": undefined,
            "constantOverrides": {
                "module_name": {
                    "export_name": "New value, it supports also number and boolean values"
                }
            },
            "dependencies": "install", // "disable" = no yarn at start, "install" = yarn install, "upgrade" = yarn upgrade
            "plugins": {
                "pluginName": {
                    "configKey": "configValue"
                }
            },
            "defaultLanguage": "en-US" // default translation language
        }
    }

## Obsolete info

Changelog: https://github.com/Bobris/Bobril-build/blob/master/CHANGELOG.md

Requires: Node version 8+ (needs to support async)

For development of bobril-build check out this project and start:

    npm link

Compile using tasks in VSCode or running `tsc` (in directories `src`, `srcHelpers`, `spec`). Web and Webt dirs are compiled by itself `bb b`.
