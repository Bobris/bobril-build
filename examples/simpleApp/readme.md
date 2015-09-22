# SimpleApp
Simple bobril application structure with defined tslint, tsconig and gulp tasks for build.

```
project
│   README.md
│   gulpfile.js
│   package.json
│   tsconfig.json
│   tslint.json
└───src // application sourc files
    │   app.ts // main application file
    │   page.ts // main page file
└───dist // generated output of bobril-bobril
```
## Start guide
Follow the next steps:
1. `npm install gulp -g`
2. `npm up`
3. `gulp` for build or `gulp watch` for build, run web server and watch for changes.
