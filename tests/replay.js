var util = require('util');
var capture = require('../index');
var sinon = require('sinon');
var expect = require('expect.js');
var http = require('http');
var https = require('https');
var replay = require('../src/replay');

describe('replay', function () {
    describe('payload', function () {
        it('should parse a GET request', function () {
            var payload = 'GET http://localhost/ HTTP/1.1\r\nuser-agent: curl/7.30.0\r\nhost: es.dev1.core.esb.cba\r\naccept: */*\r\n\r\n';
            var r = replay.parseRequest(payload);

            expect(r).to.eql({
                method: 'GET',
                url: 'http://localhost/',
                httpVersion: '1.1',
                headers: {
                    'user-agent': 'curl/7.30.0',
                    'host': 'es.dev1.core.esb.cba',
                    'accept': '*/*'
                },
                data: ''
            });
        });

        it('should parse a POST request with data', function () {
            var payload = 'POST http://localhost/ HTTP/1.1\r\nuser-agent: curl/7.30.0\r\nhost: es.dev1.core.esb.cba:8000\r\naccept: */*\r\n\r\nhello=world';
            var r = replay.parseRequest(payload);

            expect(r).to.eql({
                method: 'POST',
                url: 'http://localhost/',
                httpVersion: '1.1',
                headers: {
                    'user-agent': 'curl/7.30.0',
                    'host': 'es.dev1.core.esb.cba:8000',
                    'accept': '*/*'
                },
                data: 'hello=world'
            });
        });
    });

    describe('request', function () {
        it('should make a GET request', function () {
            var payload = 'GET http://localhost/ HTTP/1.1\r\nuser-agent: curl/7.30.0\r\nhost: es.dev1.core.esb.cba\r\naccept: */*\r\n\r\n';
            var spy1 = sinon.spy();
            var spy2 = sinon.spy();

            sinon.stub(http, 'request').returns({ on: spy1, end: spy2 });
            replay.replay(payload);

            expect(http.request.args[0][0]).to.eql({
                hostname: 'localhost',
                port: null,
                method: 'GET',
                path: '/',
                headers: {
                    'user-agent': 'curl/7.30.0',
                    'host': 'es.dev1.core.esb.cba',
                    'accept': '*/*'
                },
                httpVersion: '1.1',
                rejectUnauthorized: true
            });

            http.request.restore();
        });

        it('should parse a POST request with data', function () {
            var payload = 'POST https://localhost/ HTTP/1.1\r\nuser-agent: curl/7.30.0\r\nhost: es.dev1.core.esb.cba\r\naccept: */*\r\n\r\nhello=world';
            var spy1 = sinon.spy();
            var spy2 = sinon.spy();

            sinon.stub(https, 'request').returns({ on: spy1, end: spy2 });
            replay.replay(payload);

            expect(https.request.args[0][0]).to.eql({
                hostname: 'localhost',
                port: null,
                method: 'POST',
                path: '/',
                headers: {
                    'user-agent': 'curl/7.30.0',
                    'host': 'es.dev1.core.esb.cba',
                    'accept': '*/*'
                },
                httpVersion: '1.1',
                rejectUnauthorized: true
            });

            expect(spy2.calledWith('hello=world')).to.be(true);

            https.request.restore();
        });
    });
});
