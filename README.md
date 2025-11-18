# Bandwidth Saver

## Blocking

Assets like videos, audios, fonts and images can be optionally blocked depending on their size (if MV2 is enabled, otherwise the size cannot be determined easily).

## Compression

### Modes

There are four different modes of compressing assets at the moment; **simple redirect**, ~~**MV2 webRequestBlocking redirect**~~, **client-side monkey-patching** and **server-side proxying**:

#### Simple Redirect

The simplest implementation that redirects all relevant requests to a single public compressor endpoint.

#### ~~MV2 WebRequest Redirect (Blocking)~~

~~Only available in browsers that still support `webRequest` with the blocking privilege, every relevant request is intercepted and redirected to a valid compression service, if available, else, it falls back to the original url.~~

#### Client-side Monkey-patching

A somewhat brittle / messy approach that patches as many ways as reasonably doable, that an asset request can be made; `HTMLImageElement.prototype.src`, `fetch`, `XMLHTTPRequest`, etc so that the request url is redirected to the compression service.

#### Server-side Proxy

Simply redirects all relevant requests to a remote / self-hosted proxy that returns the compressed version.

#### Comparison

| S/N                                   | Simple Redirect | ~~MV2 WebRequest Redirect~~ | Client-side Monkey-patching | Server-side Proxy |
| ------------------------------------- | --------------- | ----------------------- | --------------------------- | ----------------- |
| MV3 Support                           | Yes             | ~~No~~                      | Yes                         | Yes               |
| No Server Costs                       | Yes             | ~~Yes~~                     | Yes                         | No                |
| Fallback on failure                   | No              | ~~Yes~~                     | Yes                         | Yes               |
| Easy implementation                   | Yes             | ~~Yes~~                     | No                          | Yes               |
| Can use the original url as reference | No              | ~~Yes~~                     | Yes                         | Yes               |
| Intercepts requests                   | Yes             | ~~Yes~~                     | No                          | Yes               |
