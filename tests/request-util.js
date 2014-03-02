var util = require('util');
var capture = require('../index');
var sinon = require('sinon');
var expect = require('expect.js');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var streams = require('memory-streams');

var triggerRequest, requestHandler;
var proxy = {
    listen: function () {}
};

function listen (app, port, options) {
    options = options || {};
    options.silent = true;

    sinon.stub(http, 'createServer').returns(proxy);

    capture.listen(app, port, options);

    expect(http.createServer.args[0][0]).to.be.a(Function);
    triggerRequest = http.createServer.args[0][0];

    http.createServer.restore();
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

        https.request.restore();
        http.request.restore();
        fs.createWriteStream.restore();
    });

    requestHandler = function (options, callback) {
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

module.exports = {
	listen: listen,
	makeRequest: makeRequest
};
