var util = require('util');
var http = require('http');
var https = require('https');

function parseRequest(payload) {
    var headDelimiterExp = /\r?\n\r?\n/;
    var headerExp = /^([^\s]+)\s([^\s]+)\sHTTP\/([\d.]+)\r?\n/i;

    var head, body, headers, summary, headerMatch;
    var method, url, version;
    var delimMatch = headDelimiterExp.exec(payload);

    if (delimMatch) {
        head = payload.substring(0, delimMatch.index);
        body = payload.substring(delimMatch.index + delimMatch[0].length);
        headerMatch = headerExp.exec(head);

        if (headerMatch) {
            method = headerMatch[1];
            url = headerMatch[2];
            version = headerMatch[3];
            headers = head.substring(headerMatch.index + headerMatch[0].length)
                .split(/\r?\n/)
                .map(function (h) { return /^([^\s:]+)\s?:\s?(.*)$/.exec(h); })
                .filter(function (m) { return m; })
                .reduce(function (obj, a) { obj[a[1]] = a[2]; return obj; }, {});

            return {
                method: method,
                url: url,
                httpVersion: version,
                headers: headers,
                data: body
            };
        } else {
            throw new Error('Cannot parse payload, problem with header');
        }
    } else {
        throw new Error('Cannot parse payload');
    }
}

function writeDictionaryToStream(stream, dict) {
    for (var i in dict) {
        stream.write(util.format('%s: %s\r\n', i, dict[i]));
    }
}

function replay(payload, opts, callback) {
    var rq = parseRequest(payload);
    var url = require('url').parse(rq.url);
    var client = url.protocol === 'https:' ? https : http;
    opts = opts || {};
    var options = {
        hostname: url.hostname,
        port: url.port,
        method: rq.method,
        path: url.path,
        headers: rq.headers,
        httpVersion: rq.httpVersion,
        rejectUnauthorized: !opts.insecure
    };

    if (opts.verbose && opts.outputHeaders) {
        console.log('%s %s HTTP/%s',
            rq.method,
            rq.url,
            options.httpVersion);

        writeDictionaryToStream(process.stdout, rq.headers);
    }

    var req = client.request(options, function (response) {
        if (opts.outputHeaders) {
            console.log('HTTP/%s %s%s', response.httpVersion, response.statusCode, response.statusMessage ? ' ' + response.statusMessage : '');
            writeDictionaryToStream(process.stdout, response.headers);
            console.log('');
        }

        response.pipe(process.stdout);

        if (callback) {
            callback(response);
        }
    });

    req.on('error', function (error) {
        console.log('Error: %s', error ? error.stack : 'Error executing request');
    });

    if (rq.data) {
        req.end(rq.data);
        if (opts.verbose) {
            console.log('\r\n%s\r\n', rq.data);
        }
    } else {
        req.end();
    }
}

module.exports = {
    parseRequest: parseRequest,
    replay: replay
};
