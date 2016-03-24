var util = require('util');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var fsUtil = require('./util/fs');

function listen (appRoot, port, options) {
    var log = null;
    options = options || {};

    var allowInsecure = options.insecure;
    var enableZip = options.zip;
    var verbose = options.verbose;

    if (options.silent) {
        log = function () {};
    } else {
        log = function () { util.log(util.format.apply(util, arguments)); };
    }

    var baseUri = require('url').parse(appRoot);
    var outputLocation = null;

    var combinePaths = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        var path = args.map(function (s) {
            return s.replace(/(^\/+|\/+$)/g, '');
        }).filter(function (s) {
            return !!s;
        }).join('/');

        if (!/^https?:\/\//i.test(path)) {
            path = '/' + path;
        }

        return path;
    };

    var getFileName = function (root, req, type) {
        var fileName = combinePaths(req.url);
        if (fileName === '/') {
            fileName = 'root';
        }
        return path.resolve(root, util.format("%s-%s.%s", fileName.replace(/^([^?]*).*/, '$1').replace(/[\/=\?:&\\]/g, '_').replace(/^_/, ''), (new Date()).valueOf(), type.substring(0, 3)));
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
        var reqStream = null, resStream = null, freqStream = null, fresStream = null;

        if (verbose || options.response || options.request) {
            reqStream = new require('stream').PassThrough();
            resStream = new require('stream').PassThrough();
        }

        if (options.response || options.request) {
            fresStream = fs.createWriteStream(getFileName(outputLocation, req, 'response'));
            resStream.pipe(fresStream);
        }
        if (options.request) {
            freqStream = fs.createWriteStream(getFileName(outputLocation, req, 'request'));
            reqStream.pipe(freqStream);
        }

        // verbose mode
        if (verbose && !options.silent) {
            reqStream.pipe(process.stdout, { end: false });
            resStream.pipe(process.stdout, { end: false });

            reqStream.on('finish', function () {
                process.stdout.write('\r\n');
            });
            resStream.on('finish', function () {
                process.stdout.write('\r\n');
            });
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

        if (options.headers) {
            if (!enableZip) {
                delete options.headers['accept-encoding'];
            }

            if (options.headers.host) {
                options.headers.host = baseUri.host;
            }
        }

        // write request headers
        if (reqFileStream) {
            reqFileStream.write(
                util.format('%s %s HTTP/%s\r\n',
                    req.method,
                    combinePaths(baseUri.protocol + '//' + options.hostname + (options.port ? ':' + options.port : ''), options.path),
                    req.httpVersion));

            if (Object.getOwnPropertyNames(req.headers).length > 0) {
                writeDictionaryToStream(reqFileStream, req.headers);
            }
        }

        log(util.format('\x1B[33m%s - %s\x1B[39m', req.method, requestUrl));
        var request = client.request(options, function (response) {
            log(util.format('\x1B[32m%s - %s\x1B[39m', response.statusCode, requestUrl));

            res.writeHead(response.statusCode, response.headers);

            if (resFileStream) {
                resFileStream.write(util.format('HTTP/%s %s%s\r\n', response.httpVersion, response.statusCode, response.statusMessage ? ' ' + response.statusMessage : ''));
                if (Object.getOwnPropertyNames(response.headers).length > 0) {
                    writeDictionaryToStream(resFileStream, response.headers);
                }

                resFileStream.write('\r\n');
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
            log(util.format('\x1B[31m%s - %s\x1B[39m', 500, requestUrl));
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.write(util.format('Request options:\r\n%j\r\n\r\n', options));
            res.end(error ? error.stack : 'Error executing request');
        });

        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            if (reqFileStream) {
                reqFileStream.write('\r\n');
                req.pipe(reqFileStream);
            }
            req.pipe(request);
            req.on('end', function () {
                request.end();
            });
        } else {
            if (reqFileStream) {
                reqFileStream.end('\r\n');
            }
            request.end();
        }
    }

    // create output folder
    if (options.response || options.request) {
        fsUtil.ensurePath(outputLocation);
    }

    proxy.listen(port, 'localhost');
    log('Proxy running on http://localhost:%s/ -> %s', port, appRoot);

    return proxy;
}

module.exports = {
    listen: listen
};
