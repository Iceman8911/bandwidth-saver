# TODO - Organized by Priority

> **Note:** This TODO was reorganized by Claude to keep it from getting messy :p

**Organization:** HIGH → MEDIUM → LOW → NEEDS RESEARCH → COMPLETED → NEW RESEARCH (2026-09)

---

## 🔴 HIGH PRIORITY - Critical Bugs & Core Features

### Critical Bugs & Blockers
- [ ] **[CRITICAL]** Enabling the extension causes cloudflare captchas and vercel checkpoints to fail
  - Cannot be bypassed/completed without disabling the extension
  - Blocks major sites and services
  - High impact on usability

### Bandwidth Wins — Tier 1 (high ROI, low risk, free) — RESEARCHED 2026-09
- [ ] **Client-Hint spoofing via DNR** (stack on existing `Save-Data` injection)
  - Send `Sec-CH-DPR: 1` + `Viewport-Width`/`Width` so Accept-CH CDNs (Cloudinary, imgix, Cloudflare) serve smaller media variants
  - ~30–80% off images/media on top of Save-Data
  - Needs `declarativeNetRequestWithHostAccess` for critical headers in Chrome
- [ ] **Curated tracker/analytics/telemetry origin blocklist via DNR** — the single highest free win
  - Curate ≤5000-rule "core" ruleset from EasyPrivacy / Peter Lowe (analytics, fingerprinting, session-replay, beacons, tracking pixels)
  - Firefox: keep dyn/session ≤5000, avoid regex (prefer `urlFilter`); Chrome: 1000 regex cap, 5k modifyHeaders cap
  - 15–55% page-weight cut on ad-heavy sites, zero CPU; add cosmetic-hide overlay so blocked elements collapse (Firefox gap)
- [ ] **`srcset`/DPR/`src` rewriting in content script** — biggest untapped image lever
  - Keep only matching srcset candidates, replace `@2x`/`dpr=2` with 1x when `devicePixelRatio<2`, reorder `<picture>` source to prefer AVIF→WebP
  - 10–40% image bytes without a proxy hop; guard on `navigator.connection.saveData`/DPR
- [ ] **Font reduction — swap webfonts for system fonts**
  - Strip Google Fonts `<link>` + `@font-face`, inject `font-family: system-ui`, DNR-block `fonts.googleapis.com`/`fonts.gstatic.com`/CDN hosts
  - ~100% of font bytes (~150–400KB/page); keep per-origin allowlist for branded/news sites

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
- [ ] Allow individual image extensions to be compressed (granular control per extension type)
- [ ] In simple mode, patch globals so that failed requests get retried with other endpoints

#### Per-site image param stripping via DNR redirects (sign-free, server-honored) — RESEARCHED 2026-09
- [ ] **Reddit**: strip/reduce `width=`/`height=` on `preview.redd.it`/`i.redd.it` → serve small thumbnail (40–80%)
- [ ] **X/Twitter**: `pbs.twimg.com/...&name=large` → `name=medium|small` (50–80%)
- [ ] **Instagram**: `cdninstagram.com` image query → prefer `_d` (default) vs `_hd` (40–60%)
- [ ] Keep existing exemption for Next.js optimized images

#### Video quality lowering (content script / page-context) — RESEARCHED 2026-09
- [ ] **Reddit**: rewrite `<video>` to `DASH_360`/`DASH_480` variants, block 720/1080 `<source>` (50–75%)
- [ ] **Meta (FB/IG)**: rewrite to `sd_src` and strip `hd_src` from page JS blob (60–75%)
- [ ] **TikTok**: page JSON exposes `720p`/`540p`/`360p` — point `<video>` at 540p/360p (40–70%)
- [ ] **X/Vimeo/Twitch**: needs HLS manifest filtering (see NEEDS RESEARCH) (40–75%)
- [ ] **YouTube**: OLD params (`gcr`, `ratebypass`, `&vdn`, `belowcon`, `videosource`, raw `itag=`) are DEAD — signed since ~2021. Use h264ify-style codec forcing + player-API quality bridge instead (fragile/experimental)
- [ ] **Netflix/EME/DRM**: NOT feasible without breaking DRM — document as unsupported

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

#### Bandwidth monitor correctness — RESEARCHED 2026-09
- [ ] Skip `fromCache` responses (don't count cache hits as bandwidth)
- [ ] Handle HTTP `206` Range responses — count only the requested range, don't double-count video seeking; sum ranges
- [ ] Cross-validate `webRequest.onHeadersReceived` `content-length` with in-page `PerformanceResourceTiming` `encodedBodySize`/`transferSize`; run off/on A/B
- [ ] Patch fetch/XHR/WS/Beacon/SSE in content script to catch non-webRequest traffic (NetMeter parity)

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

### Proxy Refinements (bandwidth-hero-proxy tricks) — RESEARCHED 2026-09
- [ ] Add `optimizerScans`/`progressive: true` JPEG params (free ~5–8% JPEG, no quality hit)
- [ ] Optional grayscale mode (Bandwidth Hero's `bw=1`) for extra savings on B&W-prone content
- [ ] Add `shouldCompress` gates: skip tracking-pixel/1×1 beacons + localhost/private IPs to avoid wasted proxy round-trips
- [ ] EXIF/metadata strip via proxy (1–5% image bytes, cheap)

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
- [ ] `iframe loading="lazy"` (you force images; confirm iframes)
- [ ] `content-visibility: auto` CSS injection for offscreen subtrees
- [ ] `upgradeScheme` http→https baseline rule (tiny win, trivial)

---

## 🤔 NEEDS RESEARCH / EXPERIMENTAL

### Service Workers
- [ ] Add a setting to forcefully remove service workers (so image compression works?)
  - **Context:** Service workers may intercept requests before DNR can redirect
  - **Concern:** PWAs rely heavily on service workers
  - **Research needed:** Can we cleanly patch service workers to let the extension reach images?
  - **Priority:** Low until research shows feasibility without breaking PWAs
- [ ] **RESEARCHED 2026-09:** MV3 extension SW is NOT a fetch handler for arbitrary web pages → service-worker CacheStorage caching of foreign content is architecturally impossible. Rely on native HTTP cache + existing cache re-writer instead.

### Monitoring
- [ ] Add extra accurate network monitoring mode using debugger API
  - Expose as toggle (default or per-site)
  - May cause performance issues
  - Compare accuracy vs patched globals approach
  - Determine if worth the complexity/performance cost

### HLS/DASH Manifest Filtering (biggest video win) — RESEARCHED 2026-09
- [ ] **Firefox**: `webRequest.filterResponseData()` + StreamFilter to strip renditions above a cap from `.m3u8`/`.mpd` (real savings; FF keeps webRequestBlocking)
  - Cap 1080p→480p ≈ 70–85% video byte reduction
- [ ] **Chrome MV3**: no response-body access → MAIN-world `fetch` hook filters manifest text before the player gets it
  - Works for hls.js-based players (Twitch, Vimeo, X) — NOT native `<video src="master.m3u8">`
- [ ] Tune audio rendition to low bitrate (64–96kbps) in DASH/HLS

### MAIN-world network chatter suppression — RESEARCHED 2026-09
- [ ] Patch `navigator.sendBeacon` (no-op for disallowed origins), `window.fetch`/`XMLHttpRequest`, and `WebSocket` constructor in MAIN world
  - Kills telemetry, beacons, keepalives, heartbeats — few % bytes but big connection/battery savings
  - DNR can't touch WebSockets; must be page-context patch (need `browser.userScripts`/`world:"MAIN"`)
  - **Conservative on Cloudflare-fronted SPAs** (see captcha mitigation)
- [ ] NetInfo-gated auto-aggression: read `navigator.connection.effectiveType`/`saveData` → auto-escalate on 2G/slow links (text-only/script-off mode, crank compression, force low DPR)

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
2. Client-Hint spoofing + tracker blocklist + srcset/DPR rewrite + font reduction (Tier 1 gains)
3. Multi-proxy support with failover
4. Fast/efficient compression modes
5. Resource size blocking
6. Settings export/import

**Then move to:**
1. Per-site image param stripping + video quality lowering
2. HLS/DASH manifest filtering (Firefox first)
3. UI improvements (overview page, warnings)
4. Site-specific fixes (pixiv, imgur)
5. Better bandwidth tracking + monitor correctness

**Eventually:**
1. MAIN-world chatter suppression + NetInfo auto-aggression
2. Proxy refinements (optimizeScans, grayscale)
3. Performance tweaks
4. Advanced statistics features
5. Experimental features (service worker patching, debugger API)

---

## 🔬 NEW RESEARCH (2026-09) — Roadmap sourced from web research

Distilled from a 5-agent research fleet. Feasible, free, cross-browser (Chrome+Firefox MV3) additions NOT yet implemented. Detailed writeup lives in the "Bandwidth Saver — Full Data-Reduction Expansion Report" shared in chat. Sources: Chrome declarativeNetRequest docs, MDN, h264ify, watch-dash, NetMeter FAQ, Bandwidth Hero DeepWiki, EasyPrivacy/Peter Lowe.

**Researched dead-ends (do NOT build):**
- `accept-encoding` renegotiation (append-only in Chrome; browsers already advertise br/zstd)
- ETag / If-None-Match forcing (~0 savings, non-functional)
- Forcing cacheability via response `Cache-Control` on Chrome (post-cache quirk — does nothing)
- MV3 SW fetch-caching of foreign pages (architecturally impossible)
- Brotli via `CompressionStream` encoder (not shipped)
- HTTP/2-3 direct control (not exposed to extensions)
- Netflix/EME quality forcing (breaks DRM)
- Opera-Turbo-style HTTPS proxy HTML recompression (dead on HTTPS)
