module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-handlebars');
  grunt.loadNpmTasks('grunt-contrib-less');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      appLib: {
        src: [
          'js/zepto/dist/zepto.js',
          'js/handlebars/dist/handlebars.js',
          'js/underscore/underscore.js',
          'js/backbone/backbone.js',
          'js/lastfm/*.js',
          'js/marked/lib/marked.js',
          'js/app/init.js',
          'js/app/utils.js',
          'js/app/config.js'
        ],
        dest: 'build/js/app_lib.js'
      },
      app: {
        src: [
          'js/app/lib_init/marked.js',
          'js/app/lib_init/handlebars.js',
          'js/app/lib_init/*.js',
          'js/app/init_mopidy.js',
          'js/app/router.js',
          'js/app/models/*.js',
          'js/app/collections/_app_collection.js',
          'js/app/collections/*.js',
          'js/app/views/_*.js',
          'js/app/views/model/*.js',
          'js/app/views/collection/*.js',
          'js/app/views/page/*.js',
          'js/app/views/*.js',
          'js/app/app.js'
        ],
        dest: 'build/js/app.js'
      }
    },
    handlebars: {
      compile: {
        files: {
          'build/js/templates.js': 'templates/**/*.hbs'
        },
        options: {
          namespace: 'App.Templates',
          processName: function (filename) {
            var stripBase = filename.match(/templates\/(.*)\.hbs$/)[1];
            var varFriendly = stripBase.replace(/[^a-z0-9]+/gi, '_');
            return varFriendly;
          },
          wrapped: true
        }
      }
    },
    less: {
      app: {
        options: {
          strictImports: true,
          compress: true
        },
        files: {
          'build/css/app.css': [
            'less/app/app.less'
          ]
        }
      }
    }
  });

  grunt.registerTask('default', 'handlebars less concat');
};
