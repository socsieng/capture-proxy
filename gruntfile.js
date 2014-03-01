'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        src: ['gruntfile.js', 'bin/capture', 'src/**/*.js'],
        tests: 'tests/**/*.js',
        all: ['<%=src%>', '<%=tests%>'],

        jshint: {
            options: grunt.file.readJSON('.jshintrc'),
            use_defaults: '<%=src%>',
            with_overrides: {
                options: {
                    globals: {
                        it: true,
                        describe: true,
                        beforeEach: true,
                        afterEach: true,
                        before: true,
                        after: true
                    }
                },
                files: {
                    src: ['<%=tests%>']
                }
            }
        },

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['<%=tests%>']
            }
        },

        watch: {
            options: {
                livereload: true
            },
            src: {
                files: '<%=src%>',
                tasks: ['build']
            },
            tests: {
                files: '<%=tests%>',
                tasks: ['test']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('test', ['mochaTest']);
    grunt.registerTask('build', ['jshint', 'mochaTest']);
};
