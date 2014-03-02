var util = require('util');
var capture = require('../index');
var sinon = require('sinon');
var expect = require('expect.js');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var reqUtil = require('./request-util');

describe('file system', function () {
    var port = '8000';

    beforeEach(function () {
    });

    afterEach(function () {
    });

    describe('paths', function () {
        var targetFolder, existsStub;

        beforeEach(function () {
            existsStub = sinon.stub(fs, 'existsSync');
            sinon.stub(fs, 'mkdirSync');
        });

        afterEach(function () {
            fs.existsSync.restore();
            fs.mkdirSync.restore();
        });

        describe('existing paths', function () {
            beforeEach(function () {
                existsStub.returns(true);
            });

            it('should map existing relative paths `.`', function () {
                targetFolder = ['.'];

                reqUtil.listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });
                expect(fs.mkdirSync.callCount).to.be(0);
            });

            it('should map existing relative paths `./output`', function () {
                targetFolder = ['.', 'output'];

                reqUtil.listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });

                expect(fs.mkdirSync.callCount).to.be(0);
            });

            it('should map existing absolute paths `/c/folder/output`', function () {
                targetFolder = ['', 'c', 'folder', 'output'];

                reqUtil.listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });

                expect(fs.mkdirSync.callCount).to.be(0);
            });
        });

        describe('new paths', function () {
            beforeEach(function () {
                existsStub.returns(false);
            });

            it('should map existing relative paths `.`', function () {
                targetFolder = ['.'];
                existsStub.withArgs('.').returns(true);

                reqUtil.listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });
                expect(fs.mkdirSync.callCount).to.be(0);
            });

            it('should map existing relative paths `./output`', function () {
                targetFolder = ['.', 'output'];
                existsStub.withArgs('.').returns(true);

                reqUtil.listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });

                expect(fs.mkdirSync.callCount).to.be(1);
                expect(fs.mkdirSync.args[0][0]).to.be(targetFolder.join(path.sep));
            });

            it('should map existing absolute paths `/c/folder/output`', function () {
                targetFolder = ['', 'c', 'folder', 'output'];
                existsStub.withArgs(targetFolder.slice(0, 2).join(path.sep)).returns(true);

                reqUtil.listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });

                expect(fs.mkdirSync.callCount).to.be(2);
                expect(fs.mkdirSync.args[0][0]).to.be(targetFolder.slice(0, 3).join(path.sep));
                expect(fs.mkdirSync.args[1][0]).to.be(targetFolder.slice(0, 4).join(path.sep));
            });

            it('should map existing absolute paths `c:\\folder\\temp\\output`', function () {
                targetFolder = ['c:', 'folder', 'temp', 'output'];
                existsStub.withArgs(targetFolder.slice(0, 1).join(path.sep)).returns(true);

                reqUtil.listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });

                expect(fs.mkdirSync.callCount).to.be(3);
                expect(fs.mkdirSync.args[0][0]).to.be(targetFolder.slice(0, 2).join(path.sep));
                expect(fs.mkdirSync.args[1][0]).to.be(targetFolder.slice(0, 3).join(path.sep));
                expect(fs.mkdirSync.args[2][0]).to.be(targetFolder.slice(0, 4).join(path.sep));
            });
        });

        describe('file names', function () {
            before(function () {
                existsStub.returns(true);
                reqUtil.listen('http://my.host.com/', port, { response: true, output: '.' });
            });

            after(function () {
            });

            it('should create file names based on basic paths - no segment', function (done) {
                reqUtil.makeRequest(
                    { method: 'GET', url: '/' },
                    { statusCode: 200, headers: {}, data: 'OK' },
                    function (req, res) {
                        expect(fs.createWriteStream.callCount).to.be(1);
                        expect(fs.createWriteStream.args[0][0]).to.match(/[\\\/]root-\d+\.res/);
                        done();
                    });
            });

            it('should create file names based on basic paths - one segment', function (done) {
                reqUtil.makeRequest(
                    { method: 'GET', url: '/something' },
                    { statusCode: 200, headers: {}, data: 'OK' },
                    function (req, res) {
                        expect(fs.createWriteStream.callCount).to.be(1);
                        expect(fs.createWriteStream.args[0][0]).to.match(/[\\\/]something-\d+\.res/);
                        done();
                    });
            });

            it('should create file names based on basic paths - two segments', function (done) {
                reqUtil.makeRequest(
                    { method: 'GET', url: '/something/else' },
                    { statusCode: 200, headers: {}, data: 'OK' },
                    function (req, res) {
                        expect(fs.createWriteStream.callCount).to.be(1);
                        expect(fs.createWriteStream.args[0][0]).to.match(/[\\\/]something_else-\d+\.res/);
                        done();
                    });
            });

            it('should create file names with query strings', function (done) {
                reqUtil.makeRequest(
                    { method: 'GET', url: '/something?here=there&and_everywhere' },
                    { statusCode: 200, headers: {}, data: 'OK' },
                    function (req, res) {
                        expect(fs.createWriteStream.callCount).to.be(1);
                        expect(fs.createWriteStream.args[0][0]).to.match(/[\\\/]something_here_there_and_everywhere-\d+\.res/);
                        done();
                    });
            });
        });
    });
});
