# Reducing Bandwidth Usage by

- [x] Apply `SaveData` on every request
- [ ] Block assets above a specified size like:
  - [ ] Images
  - [ ] Gifs
  - [ ] Videos
  - [ ] Audios
  - [ ] Fonts
  - [ ] Support more fine-grained blocking like blocking specific extensions, urls,  domains, etc
- [ ] Compress / reduce resolution of assets like:
  - [ ] Images
  - [ ] Gifs
  - [ ] Videos
  - [ ] Audios
- [ ] **Experimental**:
  - [ ] Replace `no-store` with `no-cache` on large resources
  - [ ] Replace `no-cache` with a short-lived time

# Statistics
- [ ] Split data usage into categories; image, audio, font, video, script.

# Optimization
- [ ] Site-specific data should be at the top level in the extension local storage scope, indexed by their origins so we won't have to load unrelated entries when trying to update a single site's data
