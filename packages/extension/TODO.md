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
  - [ ] Images
  - [ ] Gifs
  - [ ] Videos
  - [ ] Audios
- [ ] Prevent autoplay
- [ ] Get rid of prefetching (`<link rel="preload|prefetch|prerender">` and `dns-prefetch`)
- [ ] Patch relevant elements to make them lazy load (`loading=lazy`)
- [ ] **Experimental**:
  - [ ] Replace `no-store` with `no-cache` on large resources
  - [ ] Replace `no-cache` with a short-lived time

# Statistics

- [ ] Split data usage into categories; image, audio, font, video, script.
- [ ] Requests made to cross-origin sources by a page need to be aggregated and related somehow...
- [ ] Monitor unbounded growth by occasionally archiving statistics (making them less specific about their cross origin hosts or asset type).
  - [ ] Also consider lightweight gzip compression with native apis.
- [ ] Use big ints over numbers.

# Optimization

- [x] Site-specific data should be at the top level in the extension local storage scope, indexed by their origins so we won't have to load unrelated entries when trying to update a single site's data
