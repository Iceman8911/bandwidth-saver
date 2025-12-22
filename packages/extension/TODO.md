# General
- [-] ~~Remove "global" stuff since the behaviour is redundant to the site-scoped ones.~~
  - [x] Add more fine grained rules per site.
    - I had an old attempt in this, but the main limitation with MV3 was the fact that each site would have to have it's own rules and the maximum amount of rules is ~30000 as of December, 2025. So this new attempt will allocate a couple thousand rules for each site, and let the user know of it. Once the limits are reached, users can reset rules for older sites or depend on the global / default rules if they don't want to delete any.
      - [ ] I should also add a way of autodeleting the config for older / rarely used sites too.

# Reducing Bandwidth Usage by

- [x] Apply `SaveData` on every request
	- [x] Make this configurable
- [ ] Block assets above a specified size like:
  - [ ] Images
  - [ ] Gifs
  - [ ] Videos
  - [ ] Audios
  - [ ] Fonts
  - [ ] Iframes
  - [ ] Support more fine-grained blocking like blocking specific extensions, urls,  domains, etc
  - [ ] Blocked elements should be replaced with a transparent, but visible broder that can be clicked to load the resource.
- [ ] Compress / reduce resolution of assets like:
  - [x] Images
    - [ ] Allow individual extensions to be compressed
  - [x] Gifs
  - [ ] Videos
    - Perhaps we can just focus on popular sites like Youtube, Vimeo, Reddit?, Facebook, etc.
    - Like for reddit, the quality and format are usually specified in the query string. Perhaps a content script can deal with this?
  - [ ] Audios
  - [x] Fix ORB / CORB errors on sites like Reddit and discord.
    - Turns out this only happens with `wsrv.nl` when the image url has a query string has hasn't been [properly encoded](https://wsrv.nl/docs/introduction.html#how-it-works), i.e in simple compression mode. ~~So the next best thing, is to use the [`default`](https://wsrv.nl/docs/format.html#default-image) parameter.~~
      - Due to the way the code works, this will result in endless redirects since the compressor returns the original url which the code picks up and redirects again >~<. Our best bet is to simply ignore urls with query strings entirely.
      - ~~Using a proxy server, perhaps we can rewrite some parts of the qeury string? Like the file format and quality?~~
  - [x] Exempt request domains with `**res.cloudinary.com**` and urls with query strings since they may have optimization built in that we may affect.
  - [-] ~~Add a compression option for stripping / preserving query strings (defaults to preserving them unlike the current behaviour that strips them) for simple compression mode. Since some image links break in either of those modes.~~
    - It's probably better to not remove the query strings at all, me thinks.
  - [x] Rename query string props to prevent conflicts.
- [x] Prevent autoplay
- [x] Get rid of prefetching (`<link rel="preload|prefetch|prerender">` and `dns-prefetch`)
- [x] Patch relevant elements to make them lazy load (`loading=lazy`)
- [x] Use a content script as a fallback for failed compressed images so that they'll default to their original url (maybe using a hash fragment that includes a flag).
  - Since MV3 DNR redirecting is rather limited, perhaps I can eventually try to do proper redirecting here, and of couse still fallback to the orignal url if it doens't work out. Although this would break any site functionality that relies on expecting the original url.
- [ ] **Experimental**:
  - [-] ~~Replace `no-store` with `no-cache` on large resources~~
  - [-] ~~Replace `no-cache` with a short-lived time ~~

# Statistics

- [x] Split data usage into categories; image, audio, font, video, script.
- [x] Requests made to cross-origin sources by a page need to be aggregated and related somehow...
- [ ] Monitor unbounded growth by occasionally archiving statistics (making them less specific about their cross origin hosts or asset type).
  - [ ] Also consider lightweight gzip compression with native apis.
- [-] ~~Use big ints over numbers~~.
  - With numbers, I have a ~2 petabyte limit so it'll be more than enough lol.
- [ ] Add specific statistics like "dataUsed" per tab session (refreshed whenever the tab is reloaded / navigated away and to)
  - [ ] Maybe some other time ranges would be nice, like daily, weekly, monthly, etc.
- [ ] Since only data for roughly 300 sites can be stored in the sync area, consider if it's worth implementing a hybrid model for stroing excess data in the local-scoped extension storage.

# Monitoring

- [-] ~~Add websocket statistics~~
  - Not practical since it'll probably tank performance if I try to patch Websocket APIs to monitor data flow

# Optimization

- [x] Site-specific data should be at the top level in the extension local storage scope, indexed by their origins so we won't have to load unrelated entries when trying to update a single site's data
- [ ] Convert "jpg" to "jpeg" since that's what most sites want i think.
- [ ] Focus on commonly used sites like scoical media like Youtube, Facebook, Reddit, Discord, Twitter, Instagram, etc and other popular image-heavy sites and apply focused optimizations e.g since reddit uses custom web components for a lot of stuff, we need to account for that.
