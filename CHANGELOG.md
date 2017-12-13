# CHANGELOG

## 0.80.2

Fixed importing of modules when importing code outside of project root.

## 0.80.1

Fixed "Debug Failure. False expression." in specific combination of features. See #48 on GitHub.

## 0.80.0

Typescript upgraded to 2.6.

## 0.79.2

Replaced chrome-runner by chrome-launcher. Some small clean ups.

## 0.79.1

Fixed clash of shortened file names with application resources.

## 0.79.0

Added es2015.iterable and es2015.collection to default libs. It means that for example you can use Map because it is
supported in IE11.

## 0.78.1

Removed tracing console.log from previous version.

## 0.78.0

Allow d.ts import another d.ts without js.

## 0.77.0

Allow to disable running yarn/npm before build with -n parameter.

## 0.76.0

Allow to use --versionDir also with --fast 1.

## 0.75.1

Fixed randomly leaking Chrome process with fast tests.

## 0.75.0

Typescript 2.5.2+. Fixed problem with Timer error by setting TS compiler options by default to `types: []`.

## 0.74.1

Kill chrome headless on process end.

## 0.74.0

Allow to specify default translation language. See README for details.

## 0.73.0

Warn when import contains two slashes in row (import \* from ".//file"). When compiler options include
"declaration":true it report all emit errors.

## 0.72.1

Added workaround for yarn unable to unbold on Windows.

## 0.72.0

PhantomJs replaced by Chrome headless. Make sure to have atleast Chrome 60!

## 0.71.1

Fixed failing to open file with error in VSCode when path was absolute.

## 0.71.0

Upgrade to TypeScript 2.4

Added option -x to export all texts from translations, not just untranslated ones.

Usage:

```
bb t -x exported.txt
```

## 0.70.0

Upgrade to TypeScript 2.3

## 0.69.1

Fallback from yarn upgrade to yarn install when yarn.lock does not exist.

## 0.69.0

Fix Bobflux compilation by correctly skip generated .d.ts files.

## 0.68.0

Bundler wrongly compared included files in case sensitive way, which created duplicated source in bundle.

## 0.67.0

Updated jasmine.d.ts. Fixed translation failing in bb test. Ignore null in second parameter of g11n.t.

## 0.66.0

Automatically load @types.

## 0.65.0

Upgrade to TS 2.2.\*

## 0.64.0

Fixed bundling bug. Added console logs to interactive mode. Fixed disabling yarn for `bb b`.

## 0.63.1

Enable experimentalDecorators also in tsconfig.json.

## 0.63.0

Temporary fixate TS on 2.1.\*, to be on safe side. Fix package.json without bobril section crash from 0.61.0. Enable
experimentalDecorators by default.

## 0.62.0

Improve speed of source map resolving in console.log in tests. It hangs less often, JS is really not good for CPU
tasks...

## 0.61.0

Allow to write output of interactive session to disk.

## 0.60.0

Increase timeout for starting PhantomJs from 10s to 30s. For JS libs `global` is declared and is equal to `window`.

## 0.59.2

Fixed regression with off by one line source maps.

## 0.59.1

Optimization of tslib, generated only once so bundle is shorter, TS now internally always compile with noEmitHelpers.

## 0.58.0

Allow customize behaviour of updating dependencies at start.

## 0.57.0

Added support for bobril-g11n 3.0.0. Added support for "bb y" to start interactive mode without updating dependencies.

## 0.56.4

Fixed version of bobril-g11n and numeraljs due to inconsistencies in references

## 0.56.3

Added different workaround for typescript-collection package, while fixing bundling of moment.

## 0.56.2

Fixed another bug with TS 2.1.4. When using b.sprite with color function and builing with merge sprites.

## 0.56.1

Fixed invalid error message when exporting translation for language.

## 0.56.0

TypeScript upgraded to 2.1.4. And fixed regression of running tests in bobril-g11n (module without d.ts was not included
to compilation anymore).

## 0.55.5

styleDef prefix works for dynamic hint names

## 0.55.4

Added `--flat` parameter to `yarn install`.

## 0.55.3

Added stripping BOM mark when importing translated files. Compilation is quickly finished when any compilation errors,
also tests will not run in interactive mode in such case.

## 0.55.2

## Fix

Fixed yarn detection.

## 0.55.1

## Fix

Fix bundling error with filenames with multiple dashes.

## 0.55.0

## Fix

Temporary freeze TS to version 2.0.

## 0.54.1

## Fix

Rebuild to remove console.log. Fix some TS 2.1 compilation errors.

## 0.54.0

Prefer to use Yarn for updating dependencies. Create `.npmrc` if needed.

## 0.53.0

Allow to use conversion JSON to TXT file for translation independently to bobril-build project.

## 0.52.0

Strings for translation are now escaped so new lines inside strings will work ok. Allow to export just specific
language.

## 0.51.0

In bundling prefer "jsnext:main" in package.json which fixes importing typescript-collections, but it more like
workaround due to umd.js does not work in "use strict" context. As positive sideeffect due to not needing UMD loader
resulting bundle is 5kb shorter.

## 0.50.1

Rebuild. Repackage.

## 0.50.0

## New features

Livereload. By default it is disabled. First you need to enable it in http://localhost:8080/bb. Works both in Bobril and
Bobril Native.

## 0.49.4

## Bug fix

Removed invalid examples.

## 0.49.3

## Bug fix

Hardcoded bundling order for bobril, bobriln to be always before bobril-g11n

## 0.49.2

## Bug fix

tsconfig.json now contains correctly named default libs. Also allowJs is not enabled by default and needs to be enabled
from compilerOptions

## 0.49.1

## Bug fix

Removed left over console.logs

## 0.49.0

## New features

Using TypeScript 2.0. Allow to override compilerOptions by package.json.

## 0.48.0

## New features

Again a lot of fetures for plugins.

## Fixed

Not anymore duplicating linked css in interactive mode. Provide content-type to css to remove warnings.

## 0.47.0

## New features

A lot of new features for plugins. See bb-bobriln-plugin for usage.

## 0.46.1

## Fixed

Additional resources works again.

## 0.46.0

## New features

Bundler deduplicates \_\_extend TypeScript helper for smaller bundles.

## Fixed

Disabled one UglifyJs compression flag, to fix wrong bundle generated.

## 0.45.0

## New features

* Imported translations are checked for errors and wrong entries are skipped.
* Plugins could `require('bobril-build')` and they will get main bobril-build instance.

## Fixed

* Wrong removing all translations after import
* Removed useless --localize parameter in interactive mode - it didn't do anything.
* Made plugin linking platform independent.

  ## 0.44.0

## New features

New parameter for listing installed bobril-build plugins

-l, --list list installed plugins

Changed parameter for creating plugin link to '-s, --link'

Translations are not updated automaticaly anymore. Update translations using "bb b -u 1".

Removed ascii logo. If you want one write yourself plugin.

## 0.43.0

## New features

New parameter to force localization in interactive mode. Exported translation files has prefilled English text in
Target.

## 0.42.0

## New features

Format translation json files.

## 0.41.0

## New features

Plugins now can have configuration in package.json.

## 0.40.2

## Fix

Bundler wrongly handled multiple main files if they include each other.

## 0.40.1

## Fix

Ignore invalid packages in bundler.

## 0.40.0

## New features

Allow to override spriting in build. Also multiple examples have spriting enabled by default.

## 0.39.1

## Fixes

Not returning error code when there are some build errors.

## 0.39.0

## New features

New command line parameter for "bb b" using "-s 1" will preserve classNames in styleDefs, using "-s 2" will even add
classNames where missing in styleDef, and finally "-s 0" will remove classNames this is default for release build.

## 0.38.0

## New features

Positions informations on bb web are clickable and they focus that place in VSCode (needs latest Bobril extension)

## 0.37.0

## New features

BB web now shows build errors. BB web refactored. Build status OS notifications. Spamming Bobril logo in console!
Colored console output.

## 0.36.3

## Fixed

Can import tsx now.
