CHANGELOG
===

0.49.1
--

Bug fix
-

Removed left over console.logs

0.49.0
--

New features
--

Using TypeScript 2.0. Allow to override compileOptions by package.json.

0.48.0
--

New features
-

Again a lot of fetures for plugins.

Fixed
-

Not anymore duplicating linked css in interactive mode. Provide content-type to css to remove warnings.

0.47.0
--

New features
-

A lot of new features for plugins. See bb-bobriln-plugin for usage.

0.46.1
--

Fixed
-

Additional resources works again.

0.46.0
--

New features
-

Bundler deduplicates __extend TypeScript helper for smaller bundles.

Fixed
-

Disabled one UglifyJs compression flag, to fix wrong bundle generated.

0.45.0
--

New features
-

- Imported translations are checked for errors and wrong entries are skipped.
- Plugins could `require('bobril-build')` and they will get main bobril-build instance.


Fixed
-

- Wrong removing all translations after import
- Removed useless --localize parameter in interactive mode - it didn't do anything.
- Made plugin linking platform independent.

0.44.0
--

New features
-

New parameter for listing installed bobril-build plugins

  -l, --list    list installed plugins

Changed parameter for creating plugin link to '-s, --link'

Translations are not updated automaticaly anymore. Update translations using "bb b -u 1".

Removed ascii logo. If you want one write yourself plugin.

0.43.0
--

New features
-

New parameter to force localization in interactive mode.
Exported translation files has prefilled English text in Target.


0.42.0
--

New features
-

Format translation json files.

0.41.0
--

New features
-

Plugins now can have configuration in package.json.

0.40.2
--

Fix
-

Bundler wrongly handled multiple main files if they include each other.

0.40.1
--

Fix
-

Ignore invalid packages in bundler.

0.40.0
--

New features
-

Allow to override spriting in build. Also multiple examples have spriting enabled by default.


0.39.1
--

Fixes
-

Not returning error code when there are some build errors.

0.39.0
--

New features
-

New command line parameter for "bb b" using "-s 1" will preserve classNames in styleDefs, using "-s 2" will even add classNames where missing in styleDef, and finally "-s 0" will remove classNames this is default for release build.

0.38.0
--

New features
-

Positions informations on bb web are clickable and they focus that place in VSCode (needs latest Bobril extension)

0.37.0
--

New features
-

BB web now shows build errors. BB web refactored. Build status OS notifications. Spamming Bobril logo in console! Colored console output.

0.36.3
--

Fixed
-

Can import tsx now.
