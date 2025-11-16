# Bandwidth Saver


## Compression

### Modes

There are four different modes of compressing assets at the moment; **simple redirect**, **MV2 webRequestBlocking redirect**, **client-side monkey-patching** and **server-side proxying**:

#### Simple Redirect

The simplest implementation that redirects all relevant requests to a single public compressor endpoint. On failure, it falls back to the original url.

#### MV2 WebRequest Redirect (Blocking)

Only available in browsers that still support `webRequest` with the blocking privilege, every relevant request is intercepted and redirected to a valid compression service, if available, else, it falls back to the original url.

#### Client-side Monkey-patching

A somewhat brittle / messy approach that patches as many ways as reasonably doable, that an asset request can be made; `HTMLImageElement.prototype.src`, `fetch`, `XMLHTTPRequest`, etc so that the request url is redirected to the compression service.

#### Server-side Proxy

Simply redirects all relevant requests to a remote / self-hosted proxy that returns the compressed version.