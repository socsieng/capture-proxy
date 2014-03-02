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
    var triggerRequest, requestHandler;

    before(function () {
        sinon.stub(fs, 'mkdirSync');
        reqUtil.listen('https://my.host.com/root/', port, { response: true, request: true, output: './output' });
    });

    after(function () {
        fs.mkdirSync.restore();
    });

    describe('GET', function () {
        it('should capture a GET request', function (done) {
            reqUtil.makeRequest(
                { method: 'GET', url: '/something' },
                { statusCode: 200, headers: {}, data: 'OK' },
                function (req, res) {
                    var rq = req.toString();
                    var rs = res.toString();

                    expect(rq).to.match(/^GET \/root\/something HTTP\/[\d\.]+\r\n\r\n$/);

                    expect(rs).to.match(/^HTTP\/[\d.]+ \d+[^\r]+\r\n\r\nOK$/);
                    expect(rs).to.contain('OK');

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

                    expect(rq).to.match(/^GET \/root\/something HTTP\/[\d\.]+\r\na: 1\r\n\r\n$/);
                    expect(rq).to.contain('a: 1');

                    expect(rs).to.match(/^HTTP\/[\d.]+ \d+[^\r]+\r\nb: 2\r\n\r\nOK$/);

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

                    expect(rq).to.match(/^POST \/root\/something HTTP\/[\d\.]+\r\n\r\nhello=world$/);

                    expect(rs).to.match(/^HTTP\/[\d.]+ \d+[^\r]+\r\n\r\nOK$/);

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

                    expect(rq).to.match(/^POST \/root\/something HTTP\/[\d\.]+\r\na: 1\r\n\r\nhello=world$/);

                    expect(rs).to.match(/^HTTP\/[\d.]+ \d+[^\r]+\r\n\r\nOK$/);

                    done();
                });
        });
    });
});
