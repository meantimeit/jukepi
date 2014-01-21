module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-less');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
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

  grunt.registerTask('default', 'less');
};
