var gulp = require('gulp');
var clean = require('gulp-clean');
var ts = require('typescript'); //required just to have constants
var watch = require('gulp-watch');
var runSequence = require('run-sequence');
var replace = require('gulp-replace');
// bobril-build parts
var compilationCache = require('bobril-build/src/compilationCache');
var bobrilDepsHelpers = require('bobril-build/src/bobrilDepsHelpers');
var translationCache = require('bobril-build/src/translationCache');
var helpers = require('./gulpHelpers');

var dist = './dist/';
var src = './src/';

gulp.task('serve-dist', function () {
  helpers.startWebserver(8000);
});

gulp.task('clean-dist', function () {
  return gulp.src(dist, {
    force: true
  })
    .pipe(clean());
});

gulp.task('build-src', ['clean-dist'], function () {
  var cc = new compilationCache.CompilationCache();
  var translationDb = new translationCache.TranslationDb();
  return cc.compile({
    dir: __dirname,
    main: src + 'app.ts',
    options: {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.AMD,
      suppressExcessPropertyErrors: true,
      moduleMap: {
        "node_modules/bobril/index": {
          jsFile: "node_modules/bobril/index.js"
        }
      }
    },
    textForTranslationReplacer: translationDb.addUsageOfMessage.bind(translationDb),
    spriteMerge: false,
    writeFileCallback: helpers.write
  }).then(function () {
    bobrilDepsHelpers.writeSystemJsBasedDist(helpers.write, src + 'app.js', {})
    translationDb.pruneDbOfTemporaryUnused();
    bobrilDepsHelpers.writeTranslationFile('en', translationDb.getMessageArrayInLang('en'), 'en.js', helpers.write.bind(this));

    helpers.importLanguages(true, translationDb);
  }).then(function () {
    return gulp.src([dist + 'index.html'])
      .pipe(replace('map: {}', 'map: { "bobril" : "node_modules/bobril/index.js" }'))
      .pipe(gulp.dest(dist));
  });
});

gulp.task('default', ['build-src']);

gulp.task('watch', function () {
  runSequence('default', 'serve-dist', function () {
    watch(['./src/**/*.ts', './node_modules/**/*.ts', './g11n/*.json'], function () {
      return runSequence('default');
    });
  });
});
