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
            },
            packagejson: {
                files: 'package.json',
                tasks: ['command-version']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('command-version', 'Updates the version of command line interface from package.json file', function() {
        var commandFile = 'bin/capture';
        var packageContents = grunt.file.readJSON('package.json');
        var commandContents = grunt.file.read(commandFile);
        var exp = /(program\.version\(')([^']+)('\) \/\/ automatically updated from package\.json)/;

        if (!packageContents.version) {
            grunt.log.error('package.json does not contain version information');
        }

        var match = exp.exec(commandContents);
        if (match && match[2] !== packageContents.version) {
            commandContents = commandContents.replace(exp, '$1' + packageContents.version + '$3');
            grunt.file.write(commandFile, commandContents);
            grunt.log.ok('command line version updated to: ' + packageContents.version);
        }
    });

    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('test', ['mochaTest']);
    grunt.registerTask('build', ['jshint', 'test']);
    grunt.registerTask('publish', ['command-version','build']);
};
