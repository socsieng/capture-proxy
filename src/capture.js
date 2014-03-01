var util = require('util');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');

function listen (appRoot, port, options) {
    var log = null;
    var allowInsecure = options.insecure;
    options = options || {};

    if (options.silent) {
        log = function () {};
    } else {
        log = function () { util.log(util.format.apply(util, arguments)); };
    }

    var baseUri = require('url').parse(appRoot);
    var outputLocation = null;

    var combinePaths = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        return args.map(function (s) { return s.replace(/(^\/+|\/+$)/g, ''); }).join('/');
    };

    var ensurePath = function (fullPath) {
        var parts = fullPath.split(path.sep);
        for (var i = 1; i <= parts.length; i++) {
            var folder = parts.slice(0, i).join(path.sep);
            if (folder) {
                if (!fs.existsSync(folder)) {
                    fs.mkdirSync(folder);
                }
            }
        }
    };

    var getFileName = function (root, req, type) {
        var fileName = combinePaths(req.url) || 'root';
        return path.resolve(root, util.format("%s-%s.%s", fileName.replace(/[\/=\?:&\\]/g, '_'), (new Date()).valueOf(), type.substring(0, 3)));
    };

    var writeDictionaryToStream = function (stream, dict) {
        for (var i in dict) {
            stream.write(util.format('%s: %s\r\n', i, dict[i]));
        }
    };

    if (options.response || options.request) {
        if (!options.output) {
            throw new Error('options.output location must be specified');
        }
        outputLocation = options.output;
    }

    if (baseUri.protocol !== 'http:' && baseUri.protocol !== 'https:') {
        throw new Error('Only http and https connections are supported');
    }
    var client = baseUri.protocol === 'https:' ? https : http;

    var requestHandler = function requestHandler (req, res) {
        var reqStream = null, resStream = null;
        if (options.response || options.request) {
            resStream = fs.createWriteStream(getFileName(outputLocation, req, 'response'));
        }
        if (options.request) {
            reqStream = fs.createWriteStream(getFileName(outputLocation, req, 'request'));
        }
        routeRequest(req, res, reqStream, resStream);
    };

    var proxy = http.createServer(requestHandler);

    function routeRequest (req, res, reqFileStream, resFileStream) {
        var requestUrl = combinePaths(appRoot, req.url);
        var options = {
            hostname: baseUri.hostname,
            port: baseUri.port,
            method: req.method,
            path: combinePaths(baseUri.pathname, req.url),
            headers: req.headers,
            rejectUnauthorized: !allowInsecure
        };

        if (options.headers.host) {
            options.headers.host = baseUri.host;
        }

        // write request headers
        if (reqFileStream) {
            reqFileStream.write('METHOD: ' + req.method + '\r\n\r\n');

            if (Object.getOwnPropertyNames(req.headers).length > 0) {
                reqFileStream.write('HEADERS:\r\n');
                writeDictionaryToStream(reqFileStream, req.headers);
                reqFileStream.write('\r\n');
            }
        }

        var request = client.request(options, function (response) {
            log(util.format('%s - %s', response.statusCode, requestUrl));

            res.writeHead(response.statusCode, response.headers);

            if (resFileStream) {
                if (Object.getOwnPropertyNames(response.headers).length > 0) {
                    resFileStream.write('HEADERS:\r\n');
                    writeDictionaryToStream(resFileStream, response.headers);
                    resFileStream.write('\r\n');
                }
                resFileStream.write('BODY:\r\n');

                response.pipe(resFileStream, { end: false });
            }

            response.pipe(res);
            response.on('end', function () {
                if (resFileStream) {
                    resFileStream.end();
                }
                res.end();
            });
        });

        request.on('error', function (error) {
            log(util.format('%s - %s', 500, requestUrl));
            res.writeHead(500);
            res.end(error ? error.stack : 'Error executing request');
        });

        if (req.method === 'POST') {
            if (reqFileStream) {
                reqFileStream.write('BODY:\r\n');
                req.pipe(reqFileStream);
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
        ensurePath(outputLocation);
    }

    proxy.listen(port, 'localhost');
    log('Proxy running on http://localhost:%s/ -> %s', port, appRoot);

    return proxy;
}

module.exports = {
    listen: listen
};
