var util = require('util');
var http = require('http');
var https = require('https');
var fs = require('fs');

var capture = function (appRoot, port, options) {
	var baseUri = require('url').parse(appRoot);
	var client = baseUri.protocol === 'https:' ? https : http;
	var outputLocation = require('path').resolve(options.output);

	var proxy = http.createServer(function (req, res) {
		var reqStream = null, resStream = null;
		if (options.response || options.request) {
			resStream = fs.createWriteStream(outputLocation, getFileName(req, 'response'));
		}
		if (options.request) {
			reqStream = fs.createWriteStream(outputLocation, getFileName(req, 'request'));
		}
		routeRequest(req, res, reqStream, resStream);
	});

	function routeRequest (req, res, reqFileStream, resFileStream) {
		var requestUrl = combinePaths(appRoot, req.url);
		var options = {
			hostname: baseUri.hostname,
			port: baseUri.port,
			method: req.method,
			path: combinePaths(baseUri.pathname, req.url),
			headers: req.headers,
			rejectUnauthorized: false
		};

		options.headers.host = baseUri.host;

		// log request headers
		if (reqFileStream && req.headers) {
			reqFileStream.write('METHOD: ' + req.method + '\r\n\r\n');
			reqFileStream.write('HEADERS:\r\n');
			writeDictionaryToStream(reqFileStream, req.headers);
		}

		var request = client.request(options, function (response) {
			util.log(util.format('%s - %s', response.statusCode, requestUrl));

			res.writeHead(response.statusCode, response.headers);

			if (resFileStream) {
				resFileStream.write('HEADERS:\r\n');
				writeDictionaryToStream(resFileStream, response.headers);
				resFileStream.write('\r\n\r\nBODY:\r\n');

				response.pipe(resFileStream, { end: false});
			}

			response.pipe(res);
			response.on('end', function () {
				res.end();
			});
		});

		if (req.method == 'POST') {
			if (reqFileStream) {
				reqFileStream.write('\r\n\r\nBODY:\r\n');
				req.pipe(reqFileStream, { end: false});
			}
			req.pipe(request);
			req.on('end', function () {
				request.end();
			});
		} else {
			request.end();
		}
	}

	// create output folder
	if (options.response || options.request) {
		ensurePath(options.output);
	}

	proxy.listen(port, 'localhost');
	console.log('Proxy running on http://localhost:%s/ -> %s', port, appRoot);
}

var combinePaths = function () {
	var args = Array.prototype.slice.call(arguments, 0);
	return args.map(function (s) { return s.replace(/(^\/+|\/+$)/g, '') }).join('/');
}

var ensurePath = function (path) {
	var fullPath = require('path').resolve(path);
	var parts = fullPath.split(require('path').sep);
	var currentPath = '';

	parts.forEach(function (folder) {
		currentPath = require('path').resolve(currentPath, folder);
		if (!fs.existsSync(currentPath)) {
			fs.mkdirSync(currentPath);
		}
	});
}

var getFileName = function (root, req, type) {
	var path = require('path');
	var fileName = combinePaths(req.url) || 'root';
	return path.resolve(root, util.format("%s-%s-%s.txt", fileName.replace(/[\/=\?:&\\]/g, '_'), type, (new Date()).valueOf()));
}

var writeDictionaryToStream = function (stream, dict) {
	for (var i in dict) {
		stream.write(util.format('%s: %s\r\n', i, dict[i]));
	}
}

module.exports = {
	listen: capture
}