# Movie coverage audit

Use this audit before adding individual movies to Harbor. A movie can be in a
provider's library while missing from the initial browse page or the set of pages
that the user has already loaded. Adding a static title does not prove playback.

## Repeatable metadata check

Run with the already-installed Node.js runtime (Node 20 or newer):

```sh
node scripts/movie-coverage-audit.cjs --date 2026-10-04 --count 500 --output release/audits/movie-coverage.json
node tests/movie-coverage-audit.test.cjs
```

Choose a recent available export date. TMDB publishes exports daily by 08:00 UTC
and retains them for three months. There is no automatic date fallback: the report
should describe the snapshot explicitly chosen. The script needs no API key,
additional dependency, or access to your Harbor profile. Keep generated reports in
the ignored `release/` directory.

For a previously downloaded export, add `--tmdb-export path/to/movie_ids_MM_DD_YYYY.json.gz`
to reuse the gzip file and perform only the two provider requests. Use the file
matching `--date`; the report records cached input mode and its SHA-256. The script
cannot independently authenticate the date of a local file. Unknown/null adult or
video flags are conservatively excluded and counted in the report.

The script makes three metadata requests:

1. Read the [official TMDB daily movie-ID export](https://developer.themoviedb.org/docs/daily-id-exports),
   exclude adult/video entries, and retain the top 500 distinct movie IDs ranked
   by the export's popularity value. This includes original titles and stable IDs
   without requiring hundreds of individual metadata searches. It bounds ranking
   memory to the sample size while processing the gzip export line by line; the
   compressed download is retained in memory to fingerprint it.
2. Compare against the provider's complete daily
   [TMDB movie-ID list](https://vidapi.ru/api). This tests provider *listing*
   efficiently without crawling thousands of pages or opening players.
3. Compare the same IDs against provider latest page 1 and the desktop built-in
   movie entries. These are separate visibility indicators. Latest-added order
   is not popularity order, as described in the
   [provider listing documentation](https://vidapi.ru/api).

Each report records source URLs, dates, SHA-256 fingerprints, counts and per-ID
results. SHA-256 allows comparing snapshots; it does not authenticate the provider.
Invalid sources fail the run without creating a new report. An existing report is
left intact on failure; check the process exit status and report timestamps.

## Interpret the results

`providerListed` means the provider ID list contains that movie. It does not mean
Harbor can discover it with a particular query or play it successfully.
`providerNotListed` means absent from this single provider snapshot. Another
provider may have it, and independent snapshots can differ in freshness.

`initialProviderPageListed` and `desktopBuiltinListed` describe exact ID matches.
They are not end-to-end UI/search checks. Search and playback statuses deliberately
remain `not-tested`, and verified counts remain zero until separate testing exists.

At baseline `9b0a493`, desktop movie browsing with an empty TMDB build key uses
the provider's paginated latest feed. Movie search in that mode uses built-in
entries plus pages loaded in the current session. Therefore movies deep in the
provider library can look missing even when provider membership is confirmed.
TV's baseline no-key browse uses a small built-in fallback. Neither surface ships
the daily export or full provider index. This audit does not modify either client.

Follow up on a small representative set: check the exact title/year/ID, initial
browse visibility, search before and after loading its page, then playback readiness
and sustained playback on each available server using an isolated profile. Report
provider errors, app discovery gaps, and metadata mismatches separately. A generated
embed URL or an HTTP-success player page is insufficient playback evidence.

## Sampling limits

Popularity reflects current attention rather than an enduring film canon. The
export cannot exclude unreleased movies or shorts, or stratify language, region,
release year or genre. Original titles may differ from localized search titles.
Complement this cohort with authenticated
[TMDB top-rated](https://developer.themoviedb.org/reference/movie-top-rated-list)
and genre/year/language cohorts when legitimate build credentials are available.
Compare by stable IDs, not title substrings or provider URL construction. Do not
claim complete movie coverage or add hundreds of hardcoded titles from this result.

## Observed metadata checkpoint, October 4, 2026

The 500-film cohort was selected from 1,252,997 export records, excluding seven
records with unknown eligibility flags. The provider daily ID list contained
91,993 distinct IDs. It listed 385 of the 500 selected films (77%); 115 were absent
from that snapshot. None of the 500 appeared on provider latest page 1, and ten
appeared in the baseline desktop built-ins. Search and playback were not tested.

The latest page reported 95,215 total movies, which differs from the ID-list count.
This is evidence that the independently downloaded provider snapshots disagree;
the 115 absences must not be called confirmed provider unavailability.

The TMDB compressed export fingerprint was
`d6f857c72cb67a45068b0a4f2d3c8159593eb75ad1fa474be433aa8d6c275e9c`.
The provider ID-list fingerprint was
`ada798678db408cd58165d032fffee044969e274a0a0dd6d3f1f633f07ead00a`.
The full generated report remains under `release/audits/` locally and is excluded
from Git. This checkpoint establishes a reproducible method and the need for a
discovery/search follow-up; it does not complete all popular-movie playback coverage.
