# Bandwidth Saver

A Chrome / Firefox extension for monitoring and reducing data usage by blocking, compressing and modifying network request headers.

Settings are configured globally and may be optionally toggled per site.[^2]

## Bandwidth Monitoring

Using both the observational `webRequest` and the `Performance API`, the bandwidth consumed by requested assets can be measured *mostly* accurately.

Statistics are stored per day for at most 90 days of use, beyond that, older entries get combined into a total sum, to prevent unbounded growth (and especially because data that old won't have much use).

### Why use both of them?

- `webRequest` doesn't help here if the request is lacking the `Content-Length` header.
- `Performance API` has issues with cross-origin resources that don't have the  `Timing-Allow-Origin` header properly set.

## Blocking

Assets like videos, audios, fonts and images can be optionally blocked depending on their size[^1].

### Modes

#### Simple Blocking

The simplest implementation that blocks any matching domains / urls / assets without concern for it's actual payload size. This is due to limitations of `declarativeNetRequest`.

#### MV2 webRequestBlocking

Only supports MV2, but we can inspect the payload here and have full power to block as we wish.

#### Server-side Proxy 

Redirects to a remote proxy that can do fine-grained blocking.

## Compression

### Modes

There are four different modes of compressing assets at the moment; **simple redirect**, **MV2 webRequestBlocking redirect**, and **server-side proxying**:

#### Simple Redirect

The simplest implementation that redirects all relevant requests to a single public compressor endpoint.

#### MV2 WebRequest Redirect (Blocking)

Only available in browsers that still support `webRequest` with the blocking privilege, every relevant request is intercepted and redirected to a valid compression service, if available, else, it falls back to the original url.

#### Server-side Proxy

Simply redirects all relevant requests to a remote / self-hosted proxy that returns the compressed version.

#### Comparison

| S/N                                   | Simple Redirect | MV2 WebRequest Redirect | Server-side Proxy |
| ------------------------------------- | --------------- | ----------------------- | ----------------- |
| MV3 Support                           | Yes             | No                      | Yes               |
| No Server Costs                       | Yes             | Yes                     | No                |
| Fallback on failure                   | No              | Yes                     | Yes               |
| Easy implementation                   | Yes             | Yes                     | Yes               |
| Can use the original url as reference | No              | Yes                     | Yes               |
| Intercepts requests                   | Yes             | Yes                     | Yes               |

## Storage

Settings are synced to the user's profile while statistics are local since they can get quite heavy.

## What will not be supported

- Ad-blocking.
	- There are better suited extensions for that like Ublock, and it's recommended to have an ad-blocker to get rid of all the trash bogging up websites.

[^1]: Depending on if manifest v2 is available or a proxy server is set up.

[^2]: Supporting specific settings for each site is too much work in MV3
