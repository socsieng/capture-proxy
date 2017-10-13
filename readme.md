# capture-proxy

[![Build Status](https://travis-ci.org/socsieng/capture-proxy.png)](https://travis-ci.org/socsieng/capture-proxy)

capture-proxy is a basic nodejs proxy that allows requests and responses to be captured and optionally *replayed* at another point in time like the `curl` command.

This is achieved by pointing the application or browser to the capture-proxy which will then forward the request onto the target endpoint.

## Installation

Using npm:

```sh
$ npm install -g capture-proxy
```

## Capturing Requests and Responses

Capture HttpRequests and HttpResponses using the capture command.

```
  Usage: capture <applicationRoot> [options]

  Commands:

    replay [options]       Re-issue a request from a previously recorded
                           file
    alias                  Save a request file as a global alias that can
                           be referenced from any location on the system

  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    -p, --port <portNumber>  Port number to start listening on [8000]
    -r, --response           Save responses
    -R, --request            Save requests and responses
    -a, --ashost <hostName>  Set the host header on the proxied request. By default the `host` is based on the application root
    -o, --output [location]  When request or response capture is enabled,
                             save files to this folder [./output]
    -k, --insecure           Allow connections to SSL sites without valid
                             certs
    -z, --zip                Enable compression. By default the
                             `accept-encoding` header is removed
    -v, --verbose            Output requests and responses

Capture is a http proxy that can be used to intercept http requests and
persist the request and response payloads.

<applicationRoot> is the mounting point for the proxy. (e.g.
http://my.host.com/application/root/)
```

#### Example

```sh
# mount http://localhost:3000/
# save both requests and responses to ./captures folder
$ capture http://www.google.com/ -p 3000 -R -o ./captures
```

## Other Commands

### replay

Replay can be used as an alternative to `curl`. It condenses many of the different `curl` options into a [HttpRequest](http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html) file.

```
  Usage: replay <file|alias> [options]

  Options:

    -h, --help      output usage information
    -H, --headers   Output headers
    -k, --insecure  Allow connections to SSL sites without valid certs
    -v, --verbose   Output requests
```

#### Example

Replay by file

```sh
# load the contents of ./captures/home.req an re-issue the request
# ignoring SSL errors
$ capture replay ./captures/home.req -k
```

Replay by alias <a name="replay_alias"></a>

```sh
# load an aliased request named `myAlias` and re-issue it
$ capture replay myAlias
```

### alias

Saves a HttpRequest file as an alias that can be later used with the [`replay`](#replay_alias) command

```
  Usage: alias <alias> <requestFile>

  Options:

    -h, --help  output usage information
```

#### Example

```sh
# create the alias `myAlias` for request file ./captures/home.req
$ capture alias myAlias ./captures/home.req
```

## Why?

Sometimes fiddler isn't an option. This is a very crude and basic alternative to inspecting the requests and responses driven by a personal need to reverse engineer the invokation of SOAP services.

## Issues

* It will handle basic web page requests however static resource references are still a problem
* Cookie management
* Redirects
* Binary data - don't currently know how to handle binary data when it comes to replaying requests

## TODO

* Running the proxy under `https`
