# Bandwidth Saver

A Chrome / Firefox extension for monitoring and reducing data usage by compressing and modifying network request headers.

Settings are configured globally and may be optionally toggled per site.[^2]

## Bandwidth Monitoring

Using the non-blocking `webRequest`, and `Performance API`, the bandwidth consumed by requested assets can be measured *semi-accurately*.

Statistics are stored per day for at most 90 days of use, beyond that, older entries get combined into a total sum, to prevent unbounded growth (and especially because data that old won't have much use).

### Why use the two of them?

- `webRequest` doesn't help here if the request is lacking the `Content-Length` header.
- `Performance API` has issues with cross-origin resources that don't have the  `Timing-Allow-Origin` header properly set.

## Compression

### Modes

There are two different modes of compressing assets at the moment; **simple redirect**, and **server-side proxying**:

#### Simple Redirect

The simplest implementation that redirects all relevant requests to a single public compressor endpoint.

#### Server-side Proxy

Simply redirects all relevant requests to a remote / self-hosted proxy that returns the compressed version.

Two free test proxies that can be used are `bandwidth-saver.wuchijss2.workers.dev`, and `bandwidth-saver.onrender.com`[^3]. Use either in the popup.

#### Comparison

| S/N                                   | Simple Redirect | Server-side Proxy               |
| ------------------------------------- | --------------- | ------------------------------- |
| MV3 Support                           | Yes             | Yes                             |
| No Server Costs                       | Yes             | No (if you exceed free limits)  |
| Fallback on failure                   | No              | Yes                             |
| Easy implementation                   | Yes             | Yes                             |
| Can use the original url as reference | No              | Yes                             |
| Intercepts requests                   | Yes             | Yes                             |

## Storage

Settings and statistics are stored locally per browser profile. The former can be manually backed up and restored.

## What will not be supported

- Ad or asset blocking.
	- There are better suited extensions for that like Ublock, and it's recommended to have an ad-blocker to get rid of all the trash bogging up websites.

[^1]: Depending on if manifest v2 is available or a proxy server is set up.

[^2]: Supporting specific settings for each site is too much work in MV3

[^3]: The worker host is much, MUCH faster than the render alternative, since the latter will sleep after a while of inactivity.
