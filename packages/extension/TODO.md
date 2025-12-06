# Reducing Bandwidth Usage by

- [x] Apply `SaveData` on every request
	- [x] Make this configurable
- [ ] Block assets above a specified size like:
  - [ ] Images
  - [ ] Gifs
  - [ ] Videos
  - [ ] Audios
  - [ ] Fonts
  - [ ] Support more fine-grained blocking like blocking specific extensions, urls,  domains, etc
  - [ ] Blocked elements should be replaced with a transparent, but visible broder that can be clicked to load the resource.
- [ ] Compress / reduce resolution of assets like:
  - [x] Images
  - [x] Gifs
  - [ ] Videos
  - [ ] Audios
  - [x] Fix ORB / CORB errors on sites like Reddit and discord.
    - Turns out this only happens with `wsrv.nl` when the image url has a query string has hasn't been [properly encoded](https://wsrv.nl/docs/introduction.html#how-it-works), i.e in simple compression mode. ~~So the next best thing, is to use the [`default`](https://wsrv.nl/docs/format.html#default-image) parameter.~~
      - Due to the way the code works, this will result in endless redirects since the compressor returns the original url which the code picks up and redirects again >~<. Our best bet is to simply ignore urls with query strings entirely.
  - [x] Exempt request domains with `**res.cloudinary.com**` and urls with query strings since they may have optimization built in that we may affect.
- [ ] Prevent autoplay
- [ ] Get rid of prefetching (`<link rel="preload|prefetch|prerender">` and `dns-prefetch`)
- [ ] Patch relevant elements to make them lazy load (`loading=lazy`)
- [ ] **Experimental**:
  - [ ] Replace `no-store` with `no-cache` on large resources
  - [ ] Replace `no-cache` with a short-lived time

# Statistics

- [x] Split data usage into categories; image, audio, font, video, script.
- [x] Requests made to cross-origin sources by a page need to be aggregated and related somehow...
- [ ] Monitor unbounded growth by occasionally archiving statistics (making them less specific about their cross origin hosts or asset type).
  - [ ] Also consider lightweight gzip compression with native apis.
- [ ] Use big ints over numbers.
- [ ] Add specific statistics like "dataUsed" per tab session (refreshed whenever the tab is reloaded / navigated away and to)
  - [ ] Maybe some other time ranges would be nice, like daily, weekly, monthly, etc.

# Monitoring

- [ ] Add websocket statistics

# Optimization

- [x] Site-specific data should be at the top level in the extension local storage scope, indexed by their origins so we won't have to load unrelated entries when trying to update a single site's data
