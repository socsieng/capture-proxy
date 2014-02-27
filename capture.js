var util = require('util');
var http = require('http');
var https = require('https');
var program = require('commander');
var fs = require('fs');

program
    .version('0.0.1')
    .usage('<applicationRoot> [options]')
    .option('-p, --port <portNumber>', 'Port number to start listening on [8000]', '8000')
    .option('-r, --response', 'Save responses')
    .option('-R, --request', 'Save requests and responses')
    .option('-o, --output [location]', 'When request or response capture is enabled, save files to this folder [./output]', './output');

// if wrap method for commander is available
if (program.wrap) {
    program.wrap();
}

program.on('--help', function () {
	console.log('Capture is a http proxy that can be used to intercept http requests and persist the request and response payloads\n\n<applicationRoot> is the mounting point for the proxy. (e.g. http://my.host.com/application/root/)');
});

program.parse(process.argv);

var applicationRoot = program.args[0];

if (!applicationRoot) {
	console.error('No target specified, use the -t or --target option to specify the http endpoint you want to forward requests to');
	return;
}

var baseUri = require('url').parse(applicationRoot);
var client = baseUri.protocol === 'https:' ? https : http;

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

var getFileName = function (req, type) {
	var path = require('path');
	var fileName = combinePaths(req.url) || 'root';
	return path.resolve(path.resolve(program.output), util.format("%s-%s-%s.txt", fileName.replace(/[\/=\?:&\\]/g, '_'), type, (new Date()).valueOf()));
}

// create output folder
if (program.response || program.request) {
	ensurePath(program.output);
}

var proxy = http.createServer(function (req, res) {
	var reqStream = null, resStream = null;
	if (program.response || program.request) {
		resStream = fs.createWriteStream(getFileName(req, 'response'));
	}
	if (program.request) {
		reqStream = fs.createWriteStream(getFileName(req, 'request'));
	}
	routeRequest(req, res, reqStream, resStream);
});

var writeDictionaryToStream = function (stream, dict) {
	for (var i in dict) {
		stream.write(util.format('%s: %s\r\n', i, dict[i]));
	}
}

function routeRequest (req, res, reqFileStream, resFileStream) {
	var requestUrl = combinePaths(applicationRoot, req.url);
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

proxy.listen(program.port, 'localhost');
console.log('Proxy running on http://localhost:%s/ -> %s', program.port, applicationRoot);