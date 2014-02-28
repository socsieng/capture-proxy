var util = require('util');
var capture = require('../capture');
var sinon = require('sinon');
var expect = require('expect.js');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var streams = require('memory-streams');

describe('capture.listen', function () {
	var proxy = {
		listen: function () {}
	};
	var port = '8000';

	function listen (app, port, options) {
		options = options || {};
		options.silent = true;

		return capture.listen(app, port, options);
	}

	describe('connect', function () {
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

					listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });
					expect(fs.mkdirSync.callCount).to.be(0);
				});

				it('should map existing relative paths `./output`', function () {
					targetFolder = ['.', 'output'];

					listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });

					expect(fs.mkdirSync.callCount).to.be(0);
				});

				it('should map existing absolute paths `/c/folder/output`', function () {
					targetFolder = ['', 'c', 'folder', 'output'];

					listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });

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

					listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });
					expect(fs.mkdirSync.callCount).to.be(0);
				});

				it('should map existing relative paths `./output`', function () {
					targetFolder = ['.', 'output'];
					existsStub.withArgs('.').returns(true);

					listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });

					expect(fs.mkdirSync.callCount).to.be(1);
					expect(fs.mkdirSync.args[0][0]).to.be(targetFolder.join(path.sep));
				});

				it('should map existing absolute paths `/c/folder/output`', function () {
					targetFolder = ['', 'c', 'folder', 'output'];
					existsStub.withArgs(targetFolder.slice(0, 2).join(path.sep)).returns(true);

					listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });

					expect(fs.mkdirSync.callCount).to.be(2);
					expect(fs.mkdirSync.args[0][0]).to.be(targetFolder.slice(0, 3).join(path.sep));
					expect(fs.mkdirSync.args[1][0]).to.be(targetFolder.slice(0, 4).join(path.sep));
				});

				it('should map existing absolute paths `c:\\folder\\temp\\output`', function () {
					targetFolder = ['c:', 'folder', 'temp', 'output'];
					existsStub.withArgs(targetFolder.slice(0, 1).join(path.sep)).returns(true);

					listen('http://my.host.com/', port, { response: true, output: targetFolder.join(path.sep) });

					expect(fs.mkdirSync.callCount).to.be(3);
					expect(fs.mkdirSync.args[0][0]).to.be(targetFolder.slice(0, 2).join(path.sep));
					expect(fs.mkdirSync.args[1][0]).to.be(targetFolder.slice(0, 3).join(path.sep));
					expect(fs.mkdirSync.args[2][0]).to.be(targetFolder.slice(0, 4).join(path.sep));
				});
			});
		});
	});

	describe('request/response', function () {
		var triggerRequest;

		function createRequestStream(method, url, headers, data) {
			var request = new streams.ReadableStream();

			request.method = method;
			request.url = url;
			request.headers = headers || {};

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

			sinon.stub(https, 'request', function (options, callback) {
				https.request.restore();
				fs.createWriteStream.restore();

				process.nextTick(function () {
					callback(httpResStream);
				});

				return new streams.WritableStream();
			});

			httpResStream.on('end', function () {
				complete(capturedRequest, capturedResponse);
			});

			triggerRequest(httpReqStream, responseStream);
		}

		before(function () {
			sinon.stub(proxy, 'listen');
			sinon.stub(http, 'createServer').returns(proxy);

			listen('https://my.host.com/', port, { response: true, request: true, output: './output' });

			expect(http.createServer.args[0][0]).to.be.a(Function);
			triggerRequest = http.createServer.args[0][0];
		});

		after(function () {
			http.createServer.restore();
			proxy.listen.restore();
		});

		describe('GET', function () {
			it('should capture a GET request', function (done) {
				makeRequest(
					{ method: 'GET', url: '/something' },
					{ statusCode: 200, headers: {}, data: 'OK' },
					function (req, res) {
						var rq = req.toString();
						var rs = res.toString();

						expect(rq).to.contain('METHOD: GET');
						expect(rq).to.not.contain('HEADERS:');
						expect(rq).to.not.contain('BODY:');

						expect(rs).to.contain('BODY:');
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

						expect(rq).to.contain('METHOD: GET');
						expect(rq).to.contain('HEADERS:');
						expect(rq).to.contain('a: 1');
						expect(rq).to.not.contain('BODY:');

						expect(rs).to.contain('BODY:');
						expect(rs).to.contain('HEADERS:');
						expect(rs).to.contain('b: 2');
						expect(rs).to.contain('OK');

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

						expect(rq).to.contain('METHOD: POST');
						expect(rq).to.not.contain('HEADERS:');
						expect(rq).to.contain('BODY:');
						expect(rq).to.contain('hello=world');

						expect(rs).to.contain('BODY:');
						expect(rs).to.contain('OK');

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

						expect(rq).to.contain('METHOD: POST');
						expect(rq).to.contain('HEADERS:');
						expect(rq).to.contain('BODY:');
						expect(rq).to.contain('hello=world');

						expect(rs).to.contain('BODY:');
						expect(rs).to.contain('OK');

						done();
					});
			});
		});
	});
});