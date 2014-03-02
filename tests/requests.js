var util = require('util');
var capture = require('../index');
var sinon = require('sinon');
var expect = require('expect.js');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var streams = require('memory-streams');

describe('request/response', function () {
    var proxy = {
        listen: function () {}
    };
    var port = '8000';
    var triggerRequest, requestHandler;

    function listen (app, port, options) {
        options = options || {};
        options.silent = true;

        return capture.listen(app, port, options);
    }

    function createRequestStream(method, url, headers, data) {
        var request = new streams.ReadableStream();

        request.method = method;
        request.url = url;
        request.headers = headers || {};
        request.httpVersion = '1.1';

        if (data) {
            request.push(data);
            request.push();
        }

        return request;
    }

    function createInboundResponseStream(statusCode, headers, data) {
        var response = new streams.ReadableStream();

        response.statusCode = statusCode;
        response.headers = headers || {};
        response.httpVersion = '1.1';

        if (data) {
            response.push(data);
            response.push();
        }

        return response;
    }

    function createResponseStream() {
        var response = new streams.WritableStream();
        response.writeHead = sinon.spy();
        return response;
    }

    function makeRequest(httpRequest, httpResponse, complete) {
        var httpReqStream = createRequestStream(httpRequest.method, httpRequest.url, httpRequest.headers, httpRequest.data);
        var httpResStream = createInboundResponseStream(httpResponse.statusCode, httpResponse.headers, httpResponse.data);
        var responseStream = createResponseStream();
        var capturedRequest = new streams.WritableStream();
        var capturedResponse = new streams.WritableStream();

        var stub = sinon.stub(fs, 'createWriteStream');
        stub.onCall(0).returns(capturedResponse);
        stub.onCall(1).returns(capturedRequest);

        httpResStream.on('end', function () {
            complete(capturedRequest, capturedResponse);
        });

        requestHandler = function (options, callback) {
            https.request.restore();
            http.request.restore();
            fs.createWriteStream.restore();

            process.nextTick(function () {
                callback(httpResStream);
            });

            return new streams.WritableStream();
        };

        if (!https.request.restore) {
            sinon.stub(https, 'request', requestHandler);
        }
        if (!http.request.restore) {
            sinon.stub(http, 'request', requestHandler);
        }

        process.nextTick(function () {
            triggerRequest(httpReqStream, responseStream);
        });

        return {
            res: responseStream
        };
    }

    before(function () {
        sinon.stub(fs, 'mkdirSync');
        sinon.stub(proxy, 'listen');
        sinon.stub(http, 'createServer').returns(proxy);

        listen('https://my.host.com/root/', port, { response: true, request: true, output: './output' });

        expect(http.createServer.args[0][0]).to.be.a(Function);
        triggerRequest = http.createServer.args[0][0];
    });

    after(function () {
        http.createServer.restore();
        proxy.listen.restore();
        fs.mkdirSync.restore();
    });

    describe('GET', function () {
        it('should capture a GET request', function (done) {
            makeRequest(
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
            makeRequest(
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
            makeRequest(
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
            makeRequest(
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
