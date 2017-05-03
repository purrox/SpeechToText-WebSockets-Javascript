var gulp = require("gulp");
var debug = require('gulp-debug');
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
var tslint = require("gulp-tslint");
var util = require("gulp-util");

gulp.task("build", function() {
    return gulp.src([
            "src/common/**/*.ts",
            "src/common.browser/**/*.ts",
            "src/sdk/speech/**/*.ts",
            "src/sdk/speech.browser/**/*.ts"])
        .pipe(tslint({
            formatter: "prose",
            configuration: "src/tslint.json"
        }))
        .pipe(tslint.report({
            summarizeFailureOutput: true
        }))
        /*.pipe(debug({ title: 'Processing' }))*/
        .pipe(sourcemaps.init())
        .pipe(ts({
            target: "ES5",
            declaration: true,
            noImplicitAny: true,
            removeComments: true,
            out: 'speech.browser.sdk.js'
        }))
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest('distrib'));
});

function log(message) {
    if (typeof(msg) === 'object'){
        util.log(util.colors.blue(JSON.stringify(message)));
    } else {
        util.log(util.colors.blue(message))
    }
}