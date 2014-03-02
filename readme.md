# capture-proxy

[![Build Status](https://travis-ci.org/socsieng/capture-proxy.png)](https://travis-ci.org/socsieng/capture-proxy)

capture-proxy is a basic nodejs proxy that allows you to capture the request and response streams for all requests to a given endpoint.

This is achieved by pointing the application or browser to the capture-proxy which will then forward the request onto the target endpoint.

## Installation

Using npm:

```sh
$ npm install -g capture-proxy
```

## Usage

```sh
$ capture <applicationRoot> [options]
```

### Help

```sh
$ capture -h
#
#  Usage: capture <applicationRoot> [options]
#
#  Options:
#
#    -h, --help               output usage information
#    -V, --version            output the version number
#    -p, --port <portNumber>  Port number to start listening on [8000]
#    -r, --response           Save responses
#    -R, --request            Save requests and responses
#    -o, --output [location]  When request or response capture is enabled, save
#                             files to this folder [./output]
#    -k, --insecure           Allow connections to SSL sites without valid certs
#    -z, --zip                Enable compression. By default the
#                             `accept-encoding` header is removed
#
#Capture is a http proxy that can be used to intercept http requests and persist
#the request and response payloads.
#
#<applicationRoot> is the mounting point for the proxy.
#(e.g. http://my.host.com/application/root/)
```

### Example

```sh
# mount http://localhost:3000/
# save both requests and responses to ./captures folder
$ capture http://www.google.com/ -p 3000 -R -o ./captures
```

## Why?

Sometimes fiddler isn't an option. This is a very crude and basic alternative to inspecting the requests and responses driven by a personal need to reverse engineer the invokation of SOAP services.

## Issues

* It will handle basic web page requests however static resource references are still a problem
* Cookie management
* Redirects

## TODO

* Running the proxy under `https`
