/**
 * Dependencies.
 */
const gulp = require('gulp');
const mocha = require('gulp-mocha');


gulp.task('test', () => {
    return gulp.src('test/test_*.js', {read: false})
        .pipe(mocha({
            reporter: 'spec',
            timeout: 1000,
            bail: true
        }));
});
