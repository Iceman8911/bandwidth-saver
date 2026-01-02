# Bandwidth Saver

A Chrome / Firefox extension for monitoring and reducing data usage by compressing and modifying network request headers.

Settings are configured globally and may be optionally toggled per site.[^2]

## Bandwidth Monitoring

Using the non-blocking `webRequest`, `Performance API`, and optionally, the `debugger`, the bandwidth consumed by requested assets can be measured *mostly* accurately (the highest accuracy need the `debugger`).

Statistics are stored per day for at most 90 days of use, beyond that, older entries get combined into a total sum, to prevent unbounded growth (and especially because data that old won't have much use).

### Why use the three of them?

- `webRequest` doesn't help here if the request is lacking the `Content-Length` header.
- `Performance API` has issues with cross-origin resources that don't have the  `Timing-Allow-Origin` header properly set.
- `debugger` is the most accurate but there may be performance issues and heavier memroy usage when attaching multiple instances to different tabs, and it stops working when the user opens their devtools for the page.

## Compression

### Modes

There are four different modes of compressing assets at the moment; **simple redirect**, **MV2 webRequestBlocking redirect**, and **server-side proxying**:

#### Simple Redirect

The simplest implementation that redirects all relevant requests to a single public compressor endpoint.

#### MV2 WebRequest Redirect (Blocking)

Only available in browsers that still support `webRequest` with the blocking privilege, every relevant request is intercepted and redirected to a valid compression service, if available, else, it falls back to the original url.

#### Server-side Proxy

Simply redirects all relevant requests to a remote / self-hosted proxy that returns the compressed version.

A free test proxy that can be used is `bandwidth-saver.onrender.com`. Use that in the popup.

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

- Ad or asset blocking.
	- There are better suited extensions for that like Ublock, and it's recommended to have an ad-blocker to get rid of all the trash bogging up websites.

[^1]: Depending on if manifest v2 is available or a proxy server is set up.

[^2]: Supporting specific settings for each site is too much work in MV3
