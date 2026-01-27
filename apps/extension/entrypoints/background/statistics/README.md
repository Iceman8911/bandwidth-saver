# Bandwidth Calculation

- Data monitored from the Web Request and Performance API, via the background and an injected content script respectively, will added to a map indexed by the **full asset url** with a value similar to `{	perfApi, webRequest, firstSeenAtMs, lastUpdatedAtMs }`, where
  - `perfApi` and `webRequest` are trimmed payloads containing the size in bytes of the request and its host origin.
  - `firstSeenAtMs` and `lastUpdatedAtMs` are time points used to decide when it'd be ideal to process a pending entry in the map.
- Every time an entry is added or updated, a timeout is scheduled. When this timeout is completed, if both `perfApi` and `webRequest` are present, the entry is removed and queued into a seperate batch queue, else `firstSeenAtMs` and `lastUpdatedAtMs` are checked to see if the entry has been around long enough, if so, the entry is still removed and queued into the batch queue, else a new timeout is rescheduled for that entry and the same checks re-occur.
- In this batch queue, the main work occurs.
  - Using the queued entry, the statistics are loaded up from storage and the current day's entry is updated.
  - ~~If the number of day entries is above the limit (e.g 90), eject the oldest entries and combine them into an aggregate.~~
    - Scratch that, it'll be rather non-performant to do this on very single queued entry. this will be better off as an occasional alarm job that trims down the data once in a day.
