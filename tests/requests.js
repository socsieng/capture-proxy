var util = require('util');
var capture = require('../index');
var sinon = require('sinon');
var expect = require('expect.js');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var streams = require('memory-streams');
var reqUtil = require('./request-util');

describe('request/response', function () {
    var port = '8000';

    before(function () {
        sinon.stub(fs, 'mkdirSync');
    });

    after(function () {
        fs.mkdirSync.restore();
    });

    describe('https', function () {
        before(function () {
            reqUtil.listen('https://my.host.com/root/', port, { response: true, request: true, output: './output' });
        });

        describe('GET', function () {
            it('should capture a GET request', function (done) {
                reqUtil.makeRequest(
                    { method: 'GET', url: '/something' },
                    { statusCode: 200, headers: {}, data: 'OK' },
                    function (req, res) {
                        var rq = req.toString();
                        var rs = res.toString();

                        expect(rq).to.be('GET https://my.host.com/root/something HTTP/1.1\r\n\r\n');

                        expect(rs).to.be('HTTP/1.1 200\r\n\r\nOK');

                        done();
                    });
            });

            it('should capture a GET request with query string', function (done) {
                reqUtil.makeRequest(
                    { method: 'GET', url: '/something?foo=bar&hello=world' },
                    { statusCode: 200, headers: {}, data: 'OK' },
                    function (req, res) {
                        var rq = req.toString();
                        var rs = res.toString();

                        expect(rq).to.be('GET https://my.host.com/root/something?foo=bar&hello=world HTTP/1.1\r\n\r\n');

                        expect(rs).to.be('HTTP/1.1 200\r\n\r\nOK');

                        done();
                    });
            });

            it('should capture a GET request with a header', function (done) {
                reqUtil.makeRequest(
                    { method: 'GET', url: '/something', headers: { a: '1'} },
                    { statusCode: 200, headers: { b: '2' }, data: 'OK' },
                    function (req, res) {
                        var rq = req.toString();
                        var rs = res.toString();

                        expect(rq).to.be('GET https://my.host.com/root/something HTTP/1.1\r\na: 1\r\n\r\n');
                        expect(rq).to.contain('a: 1');

                        expect(rs).to.be('HTTP/1.1 200\r\nb: 2\r\n\r\nOK');

                        done();
                    });
            });
        });

        describe('POST', function () {
            it('should capture a POST request', function (done) {
                reqUtil.makeRequest(
                    { method: 'POST', url: '/something', data: 'hello=world' },
                    { statusCode: 200, headers: {}, data: 'OK' },
                    function (req, res) {
                        var rq = req.toString();
                        var rs = res.toString();

                        expect(rq).to.be('POST https://my.host.com/root/something HTTP/1.1\r\n\r\nhello=world');
                        expect(rs).to.be('HTTP/1.1 200\r\n\r\nOK');

                        done();
                    });
            });

            it('should capture a POST request with a header', function (done) {
                reqUtil.makeRequest(
                    { method: 'POST', url: '/something', headers: { a: '1'}, data: 'hello=world' },
                    { statusCode: 200, headers: {}, data: 'OK' },
                    function (req, res) {
                        var rq = req.toString();
                        var rs = res.toString();

                        expect(rq).to.be('POST https://my.host.com/root/something HTTP/1.1\r\na: 1\r\n\r\nhello=world');
                        expect(rs).to.be('HTTP/1.1 200\r\n\r\nOK');

                        done();
                    });
            });
        });
    });

    describe('http', function () {
        before(function () {
            reqUtil.listen('http://my.host.com/root/', port, { response: true, request: true, output: './output' });
        });

        it('should capture a GET request with query string', function (done) {
            reqUtil.makeRequest(
                { method: 'GET', url: '/something?foo=bar&hello=world' },
                { statusCode: 200, headers: {}, data: 'OK' },
                function (req, res) {
                    var rq = req.toString();
                    var rs = res.toString();

                    expect(rq).to.be('GET http://my.host.com/root/something?foo=bar&hello=world HTTP/1.1\r\n\r\n');

                    expect(rs).to.be('HTTP/1.1 200\r\n\r\nOK');

                    done();
                });
        });

        it('should capture a POST request with query string', function (done) {
            reqUtil.makeRequest(
                { method: 'POST', url: '/something?foo=bar', data: 'hello=world' },
                { statusCode: 200, headers: {}, data: 'OK' },
                function (req, res) {
                    var rq = req.toString();
                    var rs = res.toString();

                    expect(rq).to.be('POST http://my.host.com/root/something?foo=bar HTTP/1.1\r\n\r\nhello=world');
                    expect(rs).to.be('HTTP/1.1 200\r\n\r\nOK');

                    done();
                });
        });
    });

    describe('port:9000', function () {
        before(function () {
            reqUtil.listen('https://my.host.com:9000/root/', port, { response: true, request: true, output: './output' });
        });

        it('should capture a GET request with query string', function (done) {
            reqUtil.makeRequest(
                { method: 'GET', url: '/something?foo=bar&hello=world' },
                { statusCode: 200, headers: {}, data: 'OK' },
                function (req, res) {
                    var rq = req.toString();
                    var rs = res.toString();

                    expect(rq).to.be('GET https://my.host.com:9000/root/something?foo=bar&hello=world HTTP/1.1\r\n\r\n');

                    expect(rs).to.be('HTTP/1.1 200\r\n\r\nOK');

                    done();
                });
        });

        it('should capture a POST request with query string', function (done) {
            reqUtil.makeRequest(
                { method: 'POST', url: '/something?foo=bar', data: 'hello=world' },
                { statusCode: 200, headers: {}, data: 'OK' },
                function (req, res) {
                    var rq = req.toString();
                    var rs = res.toString();

                    expect(rq).to.be('POST https://my.host.com:9000/root/something?foo=bar HTTP/1.1\r\n\r\nhello=world');
                    expect(rs).to.be('HTTP/1.1 200\r\n\r\nOK');

                    done();
                });
        });
    });
});
