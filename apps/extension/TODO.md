# TODO - Organized by Priority

> **Note:** This TODO was reorganized by Claude to keep it from getting messy :p

**Organization:** HIGH → MEDIUM → LOW → NEEDS RESEARCH → COMPLETED

---

## 🔴 HIGH PRIORITY - Critical Bugs & Core Features

### Critical Bugs & Blockers
- [ ] **[CRITICAL]** Enabling the extension causes cloudflare captchas and vercel checkpoints to fail
  - Cannot be bypassed/completed without disabling the extension
  - Blocks major sites and services
  - High impact on usability

### Core Compression Features
- [ ] Allow multiple proxies to be enabled (with a preferred one that'll reroute to others if it fails to resolve)
  - [ ] Add `backupProxies` config array
  - [ ] Add `forceManualCompress` flag
  - [ ] Implement automatic failover logic
  - [ ] Add UI for managing proxy priorities
- [ ] Add "fast" and "efficient" modes for proxy compression (defaults to fast)
  - "Fast" tries multiple compression endpoints concurrently until a valid one is found, while "efficient" tries it sequentially which reduces the amount of endpoints that may actually be fetched (to save resources for your cloudinary account and stuff)
  - [ ] Define compression parameters for each mode
  - [ ] Add mode selector in UI
  - [ ] Document performance vs quality tradeoffs

### Resource Blocking & Size Limits
- [x] Block assets (implemented via DNR)
  - **Implementation note:** Generic DNR-based blocking (no size constraints)
  - Images and gifs blocked together
  - Videos and audio blocked together
  - Fonts can be blocked
  - Iframes not blocked (not planned)
  - Fine-grained blocking (specific extensions, urls, domains) not sought after
- [ ] Implement clickable placeholder for blocked elements
  - Transparent but visible border that can be clicked to load the resource
  - Show size estimate and resource type
  - Keyboard accessible

### Settings & Configuration
- [ ] Add settings exports and imports
  - [ ] Export to JSON file
  - [ ] Import from JSON file with validation
  - [ ] Add UI in options page
- [ ] Add a budget counter for regex rules
  - Display current usage vs limit (~30000 rules)
  - Disable toggles that create more regex rules when 5-50 free space remains
  - Visual indicator (progress bar or percentage)
  - Warning message when approaching limit

---

## 🟡 MEDIUM PRIORITY - Important Features & Improvements

### UI/UX Enhancements
- [ ] Add overview, site-breakdown + table to "options" page
  - [ ] Add overview section with global stats
  - [ ] Add site breakdown view (list of all tracked sites)
  - [ ] Add sortable/filterable data table
  - [ ] Add search functionality
- [ ] Add warning in the popup when most image assets are downloaded but not compressed
  - Indicator that CSP might be blocking compression
  - Suggest enabling site-specific mode
  - Link to troubleshooting docs
- [ ] Make it more obvious that for compression to work on protected images, site-specific mode has to be turned on
  - Add UI tooltip/explanation
  - Add inline help text
  - Update documentation

### Compression Improvements
- [ ] Fixup sites like pixiv, imgur, etc that require the appropriate referers and other headers
  - [ ] Handle Referer headers properly
  - [ ] Handle Origin headers
  - [ ] Handle authentication cookies where needed
  - [ ] Test on pixiv, imgur, and other protected image hosts
  - Status: Partially done, needs completion and testing
- [ ] Compress / reduce resolution of Videos
  - Focus on popular sites: Youtube, Vimeo, Reddit, Facebook
  - [ ] Reddit: Strip quality params (e.g., `https://preview.redd.it/xyz.gif?width=498&format=mp4` → `https://i.redd.it/xyz.gif`)
  - [ ] Youtube: Investigate quality parameter manipulation
  - [ ] Consider content script approach for query string manipulation
- [ ] Allow individual image extensions to be compressed (granular control per extension type)
- [ ] In simple mode, patch globals so that failed requests get retried with other endpoints

### Bandwidth Tracking & Monitoring
- [ ] Add better bandwidth tracking by patching JS DOM globals (see NetMeter extension for ideas)
  - [ ] Research NetMeter extension implementation
  - [ ] Patch `fetch` API
  - [ ] Patch `XMLHttpRequest`
  - [ ] Patch `WebSocket`
  - [ ] Patch `WebRTC` (RTCPeerConnection, RTCDataChannel)
  - [ ] Patch any other image-fetching mechanisms (Image(), background-image via computed styles, etc)
  - [ ] Integrate with existing tracking system
  - [ ] Test performance impact
- [x] Make storage local instead of sync (since 300 site limit is too restrictive)
  - Implement export/import to compensate for loss of sync
  - Migrate existing sync data to local on update

### Statistics Improvements
- [ ] Monitor unbounded growth by occasionally archiving statistics
  - Make archived data less specific (aggregate cross-origin hosts, asset types)
  - [ ] Implement archiving logic with configurable thresholds
  - [ ] Consider lightweight gzip compression with native APIs
  - [ ] Add UI to view/manage archived data
- [ ] 'Requests Compressed' sometimes ends up as N/A whilist the other statistics update :p

---

## 🟢 LOW PRIORITY - Nice-to-Haves & Optimizations

### Performance & Polish
- [ ] Make DNR settings changes smoother and on a different thread or something
  - Investigate if this causes UI freezes
  - Consider web worker or async processing
- [ ] Make the broken img link fixer work faster
- [ ] Reduce compression endpoint spam (rate limiting)
  - Implement debouncing/throttling
  - Configurable rate limit per endpoint
- [ ] Take advantage of abort controllers to stop previous fetches when they aren't needed anymore
  - Cancel in-flight requests on navigation
  - Cancel on component unmount
  - Prevent request pile-up
- [ ] Combine host and proxy into a single url endpoint field for simplicity
  - Simplify configuration
  - Reduce user confusion

### Site-Specific Optimizations
- [ ] Focus on commonly used sites (Youtube, Facebook, Reddit, Discord, Twitter, Instagram, etc)
  - Apply focused optimizations
  - Account for custom web components (e.g., Reddit)
  - Test thoroughly on each platform
- [ ] Convert "jpg" to "jpeg" since that's what most sites want (I think)
  - Research if this is actually beneficial
  - Implement extension normalization

### Additional Features
- [ ] Add time offsets to bandwidth tracking
  - Show which hours per day consume the most bandwidth
  - Daily usage patterns visualization
  - Timezone-aware tracking
- [ ] Add "dataUsed" per tab session
  - Reset on tab reload/navigation
  - [ ] Add other time ranges: daily, weekly, monthly
  - [ ] Add visual charts/graphs
- [ ] Section bandwidth by wifi / mobile data if possible
  - Research: Is this even possible in browser extensions?
  - May require native messaging or OS-level APIs
- [ ] Make the table statistics in the overview route of the options page better
  - Add more columns
  - Improve sorting/filtering
  - Better visual design
- [ ] Compress / reduce resolution of Audios
  - Lower priority since audio is typically smaller than video/images
  - Research audio compression proxies
- [ ] Add a way of auto-deleting the config for older / rarely used sites
  - Based on last-accessed timestamp
  - Configurable retention period
  - Helps with storage limits

---

## 🤔 NEEDS RESEARCH / EXPERIMENTAL

### Service Workers
- [ ] Add a setting to forcefully remove service workers (so image compression works?)
  - **Context:** Service workers may intercept requests before DNR can redirect
  - **Concern:** PWAs rely heavily on service workers
  - **Research needed:** Can we cleanly patch service workers to let the extension reach images?
  - **Priority:** Low until research shows feasibility without breaking PWAs

### Monitoring
- [ ] Add extra accurate network monitoring mode using debugger API
  - Expose as toggle (default or per-site)
  - May cause performance issues
  - Compare accuracy vs patched globals approach
  - Determine if worth the complexity/performance cost

### Cache Rate Storage
- [ ] Maybe store the cache rate too (???)
  - **Clarification needed:** What is "cache rate"? Cache hit ratio? Compression effectiveness?
  - Define metrics to track
  - Determine usefulness

---

## ✅ COMPLETED

### General
- [x] ~~Remove "global" stuff since the behaviour is redundant to the site-scoped ones~~
- [x] Add more fine grained rules per site
  - Allocate rules per site within ~30000 MV3 limit
- [x] Figure out why some sites don't have their css properly parsed when the extension is enabled
  - **Fixed:** Was content script deleting `preload` links with crucial CSS
- [x] **[RESOLVED/NON-REPRODUCIBLE]** Inspect the high cpu usage that happens as result of using the extension for days
  - Monitor for recurrence

### Reducing Bandwidth Usage
- [x] Apply `SaveData` on every request (configurable)
- [x] Compress Images
- [x] Compress Gifs
- [x] Block assets (images/gifs together, videos/audio together, fonts; via generic DNR implementation)
- [x] Prevent autoplay
- [x] Get rid of prefetching (`<link rel="prefetch|prerender">` and `dns-prefetch`)
- [x] Patch relevant elements to make them lazy load (`loading=lazy`)
- [x] Use a content script as a fallback for failed compressed images (default to original url)
- [x] Ignore recaptcha urls (any url with `/recaptcha/`)
- [x] Fix ORB / CORB errors on sites like Reddit and Discord
  - Fixed by avoiding query strings with wsrv.nl
- [x] Exempt request domains with `**res.cloudinary.com**` and urls with query strings
- [x] Rename query string props to prevent conflicts
- [x] ~~Add a compression option for stripping / preserving query strings~~
  - Decided: Better to not remove query strings at all

### Statistics
- [x] Split data usage into categories (image, audio, font, video, script)
- [x] Requests made to cross-origin sources by a page aggregated and related
- [x] ~~Use big ints over numbers~~
  - With numbers, have ~2 petabyte limit (more than enough)
- [x] ~~Since only data for roughly 300 sites can be stored in the sync area...~~
  - Will make it local with export/import instead

### Optimization
- [x] Site-specific data at top level in extension local storage, indexed by origins
  - Avoids loading unrelated entries when updating single site's data

### Monitoring
- [-] ~~Add websocket statistics~~
  - Not practical due to performance impact of patching WebSocket APIs

### Experimental (Decided Against)
- [-] ~~Replace `no-store` with `no-cache` on large resources~~
- [-] ~~Replace `no-cache` with a short-lived time~~

---

## 📝 BREAKDOWN NOTES

### Items That Were Broken Down:
1. **"Block assets above a specified size"** → Split into asset types + placeholder implementation
2. **"Add overview, site-breakdown + table"** → Split into overview, breakdown view, and table
3. **"Better bandwidth tracking by patching globals"** → Split by API type (fetch, XHR, WebSocket, WebRTC)

### Merged Duplicates:
- "patch fetch & xhr on both modes" merged into "Add better bandwidth tracking" as subtasks

---

## 🎯 QUICK PRIORITY SUMMARY

**Focus on first:**
1. Fix captcha/checkpoint failures (critical blocker)
2. Multi-proxy support with failover
3. Fast/efficient compression modes
4. Resource size blocking
5. Settings export/import

**Then move to:**
1. UI improvements (overview page, warnings)
2. Site-specific fixes (pixiv, imgur)
3. Video compression
4. Better bandwidth tracking with patched globals

**Eventually:**
1. Performance tweaks
2. Site-specific optimizations
3. Advanced statistics features
4. Experimental features (service worker patching, debugger API)
