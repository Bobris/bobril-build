var gulp = require('gulp');
var fs = require('graceful-fs');
var typeScriptCompile = require('./tscomp.js');
var through2 = require('through2');

gulp.task('bump', function(){
  var bump = require('gulp-bump');
  return gulp.src('./package.json')
    .pipe(bump({version: 'minor'}))
    .pipe(gulp.dest('./'));
});

var alltsfilesToWatch = ['src/**/*.ts','spec/**/*.ts','*.ts'];
var alltsProjsToCompile = ['./src/tsconfig.json','./spec/tsconfig.json','./tsconfig.json'];
alltsfilesToWatch = alltsfilesToWatch.concat(alltsProjsToCompile);

gulp.task('ts', ['compilets'], function () {
    gulp.watch(alltsfilesToWatch, ['compiletsi']);
});

gulp.task('compiletsi', function () {
    return gulp.src(alltsProjsToCompile, { read:false })
	      .pipe(through2.obj(function(file,enc,cb) {
			  typeScriptCompile(file.path, false);
			  setImmediate(cb);
			  }));
});

gulp.task('compilets', function () {
    return gulp.src(alltsProjsToCompile, { read:false })
	      .pipe(through2.obj(function(file,enc,cb) {
			  console.log(file.path);
			  typeScriptCompile(file.path, true);
			  setImmediate(cb);
			  }));
});

gulp.task('watch', ['ts']);

gulp.task('default', ['watch']);
