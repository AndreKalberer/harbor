# Unloaded movie discovery: bounded metadata prototype

Read-only research, separate from the published coverage audit. No desktop/TV
search, browse, providers, user profiles, or playback changes. Do not ship this as
proof of availability. No network requests are implemented in the prototype.

## Sources and scope

Join the [official TMDB daily movie-ID export](https://developer.themoviedb.org/docs/daily-id-exports)
to VidAPI's [documented daily TMDB movie-ID list](https://vidapi.ru/api).
Stream the cached gzip and retain only provider-listed records with explicitly
false adult/video flags. Search original titles and exact IDs in a Node worker.
No individual embeds, accounts, API keys, or added dependencies are needed.
Membership remains `playbackStatus: not-tested`.

The cached October 4 export contains exactly `adult`, `id`, `original_title`,
`popularity`, and `video`. It has no release date/year, poster, genre, language,
localized title, or alias list. TMDB says these are not full data exports.
Its [authenticated search workflow](https://developer.themoviedb.org/docs/search-and-query-for-details)
is the stronger method when legitimate build credentials are available.

VidAPI documents full ID files and latest-added page metadata, but no title-search
endpoint or per-ID metadata lookup. Its docs currently describe 24 items/page,
where the earlier live audit observed 20. Read response values rather than assume
page size. Full-feed crawling would cost thousands of requests and still need
snapshot consistency handling. Separate IMDb/TMDB lists are not an ID mapping.

## Local checkpoint

October 5, 2026 run reused the audit's October 4 gzip (28,129,840 bytes). One public
provider-list download returned 91,993 IDs and the same SHA-256 as the audit:
`ada798678db408cd58165d032fffee044969e274a0a0dd6d3f1f633f07ead00a`.
The worker scanned 1,252,997 rows / 129,369,990 expanded bytes and retained 90,983
eligible, titled provider-listed movies. This intersection is not a provider total.

Build took 3.565 seconds. Worker heap used was 68,806,984 bytes; whole-process RSS
was 154,775,552 bytes, not a worker delta or peak. Complete run CPU was 5.89 seconds
user / 0.797 seconds system, including build and queries. Across 100 sequential
warm queries: roundtrip median 23.5ms, p95 30.7ms, max 31.9ms. Parent 10ms heartbeat
maximum observed gap was 26ms. These are local Node measurements, not UI or TV QA.

After moving byte/line guards ahead of decoding, one justified cached rerun checked
the changed scanner's performance and full-export compatibility. It retained the
same 90,983 records and exact 129,369,990-byte count. Build took 5.046 seconds;
worker heap used 68,245,280 bytes / process RSS 158,298,112 bytes. Warm roundtrip
median was 26.2ms, p95 31.4ms, max 33.0ms; parent heartbeat max gap was 25.7ms.
Complete-run CPU was 7.516 seconds user / 0.641 seconds system. Guarded results are
in `release/discovery-prototype/benchmark-stream-guard.json` in the primary
workspace. This rerun used only cached inputs, with no additional download.

All five automatically selected audit probes outside baseline built-ins and page 1
were found. `Resident Evil: Welcome to Raccoon City` returned `460458` without
loading its browse page. Other probes include upcoming titles: this export cannot
identify released-film or verified-playable popularity cohorts.

`기생충` and `tmdb:496243` found Parasite's record. `Parasite` returned other IDs,
not `496243`. `千と千尋の神隠し` and `tmdb:129` found Spirited Away; the English title
returned nothing. Accent-folded `Amelie` found `194` and other originals. Identity
must remain the stable TMDB ID; remakes and accent collisions stay separate.

Ignored raw artifacts are in the primary workspace's
`release/discovery-prototype/benchmark.json` and adjacent `provider-ids.txt`.

## Reproduce offline

```sh
node tests/movie-discovery-prototype.test.cjs
node scripts/bench-movie-discovery.cjs <cached-export.json.gz> <provider-ids.txt> <prior-audit.json> <ignored-output.json>
```

Fixtures cover remakes, accent collisions, CJK original/ID search, unlisted/adult/
unknown eligibility exclusion, malformed input, duplicate-ID rejection, and reuse
of the actual renderer's `formatVidSrcMovie` identity. Results omit unsupported
year/poster fields; that formatter yields `vidsrc-movie-<ID>` and VidAPI preference.
Merge future candidates with loaded metadata by stable ID, preserving richer
fields. Apply the separately reviewed provider-listing formatter change on eventual
integration; this prototype does not require that PR or alter its files. Streaming
regressions verify oversized unterminated gzip lines and total inflation are
rejected before compressed/inflated EOF, plus a single 409,600-byte input chunk.
One-byte chunks preserve UTF-8 titles, CRLF across chunks, standalone CR, and a
final line without a delimiter. Worker fixtures cover successful startup/query,
invalid queries, query after termination, malformed gzip, line-limit failure, and
invalid provider IDs; startup failure terminates its worker.

Bounds: 60MB compressed export, 350MB expanded bytes, 2m rows, 150k provider IDs,
3MB provider text, 65,536 UTF-8 bytes per line excluding delimiters, 1,000 UTF-16
code units per title, 200 UTF-16 code units per query, max 50 results. Expanded-byte
and pending-line limits are checked on raw chunks before line concatenation or
UTF-8 decoding; total bytes count actual delimiters. A rejected chunk is never
decoded. No more than 65,536 pending line bytes are retained between chunks; the
currently supplied source chunk and stream buffering are additional transient
memory. Worker failure destroys both compressed and decompressed pipeline stages
and discards the run. Guards are not a production resource-security guarantee.
Plain numeric queries currently mean IDs; a runtime UI should use the
explicit `tmdb:<ID>` syntax if numeric film titles need ordinary title matching.

## Proposed runtime scope for parent review

After ownership approval, implement only desktop no-key movie discovery. Lazily
start one shared background worker, debounce input, ignore superseded responses,
and return at most 20 candidates. Keep the index out of the renderer; preserve
stable namespace, original title, unsupported empty fields, source dates, and
listing-only status. Search must not open players or select playback servers.

Cache raw snapshots and a versioned compact intersection outside the saved
library/profile. Suggested TTL is 24 hours, one shared in-flight refresh, with a
maximum seven-day stale fallback labeled stale/offline. An expired provider
snapshot cannot claim current membership. Keep last valid cache on failure;
validate complete replacements before atomic rename. Record fetched timestamps,
chosen TMDB export date, both hashes, schema/normalization version, and counts.
Hashes prove repeatability, not authenticity. Require dated filename/manifest
instead of guessing a local gzip date. Production also needs cancellation,
bounded download/timeouts/retries, and killable worker startup.

This method alone cannot deliver reliable English/global title search. Prefer
legitimate keyed TMDB metadata for that requirement. An authorized alias dataset
would need separate license, ID-map, freshness, download-size, and performance
review. Do not fabricate translations, borrow credentials, or hardcode hundreds
of titles. Original-title/ID discovery can still improve no-key search honestly.

TV remains deferred: this Node worker and ~65.6MiB worker heap cannot be assumed
portable to constrained TV browsers. Compact delivery/Web Worker design needs
separate cross-surface and device QA.
