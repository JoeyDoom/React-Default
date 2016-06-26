var source = require('vinyl-source-stream');
var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');
var notify = require('gulp-notify');
var sass = require('gulp-sass');
var cache = require('gulp-cache');
var imagemin = require('gulp-imagemin');
var sourcemaps = require('gulp-sourcemaps');

var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var buffer = require('vinyl-buffer');

var browserSync = require('browser-sync');
var reload = browserSync.reload;
var historyApiFallback = require('connect-history-api-fallback')


/*
  Styles Task
*/

// gulp.task('styles',function() {
//   // move over fonts

//   gulp.src('css/fonts/**.*')
//     .pipe(gulp.dest('build/css/fonts'))

//   // Compiles CSS
//   gulp.src('css/style.styl')
//     .pipe(stylus())
//     .pipe(autoprefixer())
//     .pipe(gulp.dest('./build/css/'))
//     .pipe(reload({stream:true}))
// });

//compile sass
gulp.task('sass', function(){
  var autoprefixerOptions = {
    browsers: ['last 2 versions', '> 5%', 'Firefox ESR']
  };

  return gulp.src('./sass/app.sass') //source sass file
  .pipe(sourcemaps.init())
  .pipe(sass().on('error', sass.logError))
  .pipe(sourcemaps.write())
  .pipe(autoprefixer(autoprefixerOptions)) //autoprefixin
  .pipe(gulp.dest('./css')) //final css output destination
  .pipe(reload({stream:true}))
});

/*
  Images
*/
gulp.task('images', function(){
  return gulp.src('./img/**/*.+(png|jpg|jpeg|gif|svg)')
  // Caching images that ran through imagemin
  .pipe(cache(imagemin({
      interlaced: true
    })))
  .pipe(gulp.dest('./dist/img'))
});

//move fonts to the right place
gulp.task('fonts', function() {
  return gulp.src('./fonts/**/*')
  .pipe(gulp.dest('./dist/fonts'))
});

//clean up and delete everything in dist -- run before building
gulp.task('clean', function(callback) {
  del('dist');
  return cache.clearAll(callback);
})

gulp.task('reload', function() {
  return gulp.src('index.html')
  .pipe(reload({stream:true}))
});

/*
  Browser Sync
*/
gulp.task('browser-sync', function() {
    browserSync({
        // we need to disable clicks and forms for when we test multiple rooms
        server : {},
        middleware : [ historyApiFallback() ],
        ghostMode: false
    });
});

function handleErrors() {
  var args = Array.prototype.slice.call(arguments);
  notify.onError({
    title: 'Compile Error',
    message: '<%= error.message %>'
  }).apply(this, args);
  this.emit('end'); // Keep gulp from hanging on this task
}

function buildScript(file, watch) {
  var props = {
    entries: ['./scripts/' + file],
    debug : true,
    cache: {},
    packageCache: {},
    transform:  [babelify.configure({stage : 0 })]
  };

  // watchify() if watch requested, otherwise run browserify() once 
  var bundler = watch ? watchify(browserify(props)) : browserify(props);

  function rebundle() {
    var stream = bundler.bundle();
    return stream
      .on('error', handleErrors)
      .pipe(source(file))
      .pipe(gulp.dest('./build/'))
      // If you also want to uglify it
      // .pipe(buffer())
      // .pipe(uglify())
      // .pipe(rename('app.min.js'))
      // .pipe(gulp.dest('./build'))
      .pipe(reload({stream:true}))
  }

  // listen for an update and run rebundle
  bundler.on('update', function() {
    rebundle();
    gutil.log('Rebundle...');
  });

  // run it once the first time buildScript is called
  return rebundle();
}

gulp.task('scripts', function() {
  return buildScript('main.js', false); // this will run once because we set watch to false
});

// run 'scripts' task first, then watch for future changes
gulp.task('default', ['images','sass','scripts','browser-sync'], function() {
  gulp.watch('sass/**/*', ['sass']); // gulp watch for stylus changes
  gulp.watch('index.html', ['reload']); // gulp watch for stylus changes
  return buildScript('main.js', true); // browserify watch for JS changes
});
