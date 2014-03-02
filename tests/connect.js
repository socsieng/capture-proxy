var util = require('util');
var capture = require('../index');
var sinon = require('sinon');
var expect = require('expect.js');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');

describe('connect', function () {
    var proxy = {
        listen: function () {}
    };
    var port = '8000';

    function listen (app, port, options) {
        options = options || {};
        options.silent = true;

        return capture.listen(app, port, options);
    }

    beforeEach(function () {
        sinon.stub(proxy, 'listen');
        sinon.stub(http, 'createServer').returns(proxy);
    });

    afterEach(function () {
        http.createServer.restore();
        proxy.listen.restore();
    });

    it('should open a http connection', function () {
        listen('http://my.host.com/', port, { output: '.' });

        expect(http.createServer.callCount).to.be(1);
        expect(proxy.listen.callCount).to.be(1);
        expect(proxy.listen.args[0]).to.eql([port, 'localhost']);
    });

    it('should open a https connection', function () {
        listen('https://my.host.com/', port);

        expect(http.createServer.callCount).to.be(1);
        expect(proxy.listen.callCount).to.be(1);
        expect(proxy.listen.args[0]).to.eql([port, 'localhost']);
    });

    it('should not open a non http/https connection', function () {
        expect(function () {
            listen('ftp://my.host.com/', port, { output: '.' });
        }).to.throwException();
    });

    it('should open a https connection, when requests and responses are enabled', function () {
        listen('https://my.host.com/', port, { response: true, request: true, output: '.' });

        expect(http.createServer.callCount).to.be(1);
        expect(proxy.listen.callCount).to.be(1);
        expect(proxy.listen.args[0]).to.eql([port, 'localhost']);
    });

    it('should fail when no output path specified, but responses are enabled', function () {
        expect(function () {
            listen('http://my.host.com/', port, { response: true });
        }).to.throwException();
    });

    it('should fail when no output path specified, but requests and responses are enabled', function () {
        expect(function () {
            listen('http://my.host.com/', port, { response: true, request: true });
        }).to.throwException();
    });

    describe('requests', function () {
        function triggerRequest (requestHeaders) {
            expect(http.createServer.args[0][0]).to.be.a(Function);
            http.createServer.args[0][0]({ url: '/', headers: requestHeaders || {} });
        }

        beforeEach(function () {
            sinon.stub(https, 'request').returns({
                on: sinon.stub(),
                end: sinon.stub()
            });

            sinon.stub(http, 'request').returns({
                on: sinon.stub(),
                end: sinon.stub()
            });
        });

        afterEach(function () {
            https.request.restore();
            http.request.restore();
        });

        describe('http/https', function () {
            it('should use the http client when listening to a host with the `http` protocol', function () {
                listen('http://my.host.com/', port, {});
                triggerRequest();

                expect(https.request.callCount).to.be(0);
                expect(http.request.callCount).to.be(1);
            });

            it('should use the https client when listening to a host with the `https` protocol', function () {
                listen('https://my.host.com/', port, {});
                triggerRequest();

                expect(https.request.callCount).to.be(1);
                expect(http.request.callCount).to.be(0);
            });
        });

        describe('rejectUnauthorized', function () {
            it('should send the `rejectUnauthorized: true` property by default', function () {
                listen('http://my.host.com/', port, {});
                triggerRequest();

                var options = http.request.args[0][0];
                expect(options).to.have.property('rejectUnauthorized', true);
            });

            it('should send the `rejectUnauthorized: true` property when `insecure: false`', function () {
                listen('http://my.host.com/', port, { insecure: false });
                triggerRequest();

                var options = http.request.args[0][0];
                expect(options).to.have.property('rejectUnauthorized', true);
            });

            it('should send the `rejectUnauthorized: false` property when `insecure: true`', function () {
                listen('http://my.host.com/', port, { insecure: true });
                triggerRequest();

                var options = http.request.args[0][0];
                expect(options).to.have.property('rejectUnauthorized', false);
            });
        });

        describe('compression', function () {
            it('should remove the `accept-encoding` header by default', function () {
                listen('http://my.host.com/', port, {});
                triggerRequest({
                    'accept-encoding': 'gzip,deflate',
                    'other': 'value'
                });

                expect(http.request.callCount).to.be(1);

                var options = http.request.args[0][0];
                expect(options).to.have.property('headers');
                expect(options.headers).to.not.have.property('accept-encoding');
                expect(options.headers).to.have.property('other');
            });

            it('should remove the `accept-encoding` header when `zip: false`', function () {
                listen('http://my.host.com/', port, { zip: false });
                triggerRequest({
                    'accept-encoding': 'gzip,deflate',
                    'other': 'value'
                });

                expect(http.request.callCount).to.be(1);

                var options = http.request.args[0][0];
                expect(options).to.have.property('headers');
                expect(options.headers).to.not.have.property('accept-encoding');
                expect(options.headers).to.have.property('other');
            });

            it('should send the `accept-encoding` header when `zip: true`', function () {
                listen('http://my.host.com/', port, { zip: true });
                triggerRequest({
                    'accept-encoding': 'gzip,deflate',
                    'other': 'value'
                });

                expect(http.request.callCount).to.be(1);

                var options = http.request.args[0][0];
                expect(options).to.have.property('headers');
                expect(options.headers).to.have.property('accept-encoding');
                expect(options.headers).to.have.property('other');
            });
        });
    });
});
