var gulp = require('gulp');

gulp.task('scripts', function () {
  gulp.src('node_modules/leaflet/dist/*.js').pipe(gulp.dest('dist/js'));
  gulp.src('node_modules/leaflet/dist/*.css').pipe(gulp.dest('dist/css'));
  gulp.src('node_modules/leaflet/dist/images/*').pipe(gulp.dest('dist/css/images'));

  gulp.src('node_modules/leaflet-measure/dist/*.js').pipe(gulp.dest('dist/js'));
  gulp.src('node_modules/leaflet-measure/dist/*.css').pipe(gulp.dest('dist/css'));
  gulp.src('node_modules/leaflet-measure/dist/images/*').pipe(gulp.dest('dist/css/images'));

  gulp.src('node_modules/leaflet-measure-path/*.js').pipe(gulp.dest('dist/js'));
  gulp.src('node_modules/leaflet-measure-path/*.css').pipe(gulp.dest('dist/css'));

  gulp.src('node_modules/leaflet.markercluster/dist/*.js').pipe(gulp.dest('dist/js'));
  gulp.src('node_modules/leaflet.markercluster/dist/*.css').pipe(gulp.dest('dist/css'));

  gulp.src('node_modules/togeojson/*.js').pipe(gulp.dest('dist/js'));

  gulp.src('node_modules/leaflet-geosearch/dist/*.js').pipe(gulp.dest('dist/js'));

  gulp.src('node_modules/tokml/*.js').pipe(gulp.dest('dist/js'));

  gulp.src('node_modules/wkx/dist/*.js').pipe(gulp.dest('dist/js'));

  gulp.src('node_modules/leaflet-filelayer/src/*.js').pipe(gulp.dest('dist/js'));

  gulp.src('node_modules/jszip/dist/*.js').pipe(gulp.dest('dist/js'));

  gulp.src('node_modules/xlsx/dist/*.js').pipe(gulp.dest('dist/js'));
});

gulp.task('copy', function () {
  gulp.src('img/*').pipe(gulp.dest('dist/img'));
  gulp.src('js/*').pipe(gulp.dest('dist/js'));
  gulp.src('favicon.ico').pipe(gulp.dest('dist'));
  gulp.src('index.html').pipe(gulp.dest('dist'));
});

gulp.task('build', function () {
  gulp.start('scripts');
  gulp.start('copy');
});