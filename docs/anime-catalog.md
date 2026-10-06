# Offline anime metadata catalog

Without a TMDB key, Anime opens a **Library** of 4,132 titles: 3,131 series and 1,001 films. **Movies** selects the films. Pages contain 40 titles sorted by name; this is not labelled popularity ranking. English scoped library search folds accents, so Pokemon matches Pokémon. Japanese labels/titles remain provenance and are not advertised as native-script desktop search support. Configured TMDB browsing retains its existing filters. New titles are marked **Metadata only** and playback availability is unverified. No provider listing is inferred from an ID/classification or preference.

## Source and eligibility

[Wikidata's licensing declaration](https://www.wikidata.org/wiki/Wikidata:Licensing) releases structured entity/property data under CC0. This records its declaration, not an independent legal guarantee. The bounded [query](../research/anime-metadata/query.sparql) selects direct P31 anime TV Q63952888 with P4983, and anime film Q20650540 with P4947. No prose, posters or other images are imported. English/Japanese labels retain their language; a Japanese label is not a work's original language or audio. Raw language IDs and publication/start dates remain provenance, not invented year/genre/rating/episode fields.

The 2026-10-05 response has 4,173 mappings for 4,172 entities; conservative normalization retains 4,145 candidates after missing-English and ambiguous-identity exclusions. Response/query hashes are embedded in the asset. Truthy wdt statements omit qualifiers, references and per-entity revisions; the response hash identifies the captured query result, not an immutable entity revision.

The [official TMDB daily exports](https://developer.themoviedb.org/docs/daily-id-exports) were publicly accessible without authentication. All joined exports are dated **2026-10-04**. Movies require explicit adult=false AND video=false; missing/null flags or absent IDs are excluded. Ordinary TV has 232,988 IDs and adult TV has 2,316, with zero overlap in this capture. The inferred valid TV universe is their union; eligibility requires ordinary membership and absence from the adult set. The documentation identifies the adult dataset, without promising perfect completeness: this is a dated producer-partition inference, not a recovered raw flag or child-safety claim. Adult wins overlap. Missing sets, mixed dates, malformed/truncated data and out-of-universe IDs remain unknown/excluded. No TV video=false is inferred.

Gzip streams are decoded through EOF/CRC validation, checked for positive unique IDs and TV name/popularity schema, and hashed. The manual generator binds exact reviewed bytes to their dated URLs. Source normalization plus eligibility exclusions produce **4,132 rows**: nine movie and four TV candidates fail eligibility. Each retained row carries its entity, explicit class, source URL/date and eligibility origin.

Reviewed SHA-256 values:

- Wikidata response: 9d6e44d5980d19685acabc9f5c541fd272b05848f6289ada73cd5ffee0ba8456 (UTF-8 BOM included).
- Movie export: d6f857c72cb67a45068b0a4f2d3c8159593eb75ad1fa474be433aa8d6c275e9c.
- Ordinary TV: b5f2435e229f7b920bc331ed3734dc6e72b6c084d9561502a267a59dfb829598.
- Adult TV: 2ca3a5b923772d394794aa37a8e01aea13b064e70e95b1ffaabc526a17857a13.

## Identity, freshness and regeneration

Seventeen included movie roots overlap mapped TV numeric IDs; types remain separate. Existing desktop anime IDs w-19 through w-24 and w-bleach are reused. TV retains anime-1429 and anime-30984. New desktop records follow existing typed vidsrc-movie-/vidsrc-tv- formatter IDs, without availability claims. TV uses movie-/anime-. Saved IDs, favorites, progress and profile schema are not migrated. Existing snapshot fields preserve empty year/rating and metadata-only sections/overview.

This manually refreshed snapshot is incomplete and community mappings can be wrong. OVA/ONA-only works, indirect classes, unmapped/missing-English works and ambiguity groups are excluded. Explicit anime classes do not classify every animation or settle every cultural definition. No runtime dataset request, startup network fetch, background refresh or account action is added.

Run the offline compiler with the captured query response and reviewed exports:

```text
node scripts/compile-anime-metadata.cjs <wikidata-response.json> <movie.gz> <ordinary-tv.gz> <adult-tv.gz> shared/anime-metadata.js
```

Changed source dates/hashes require manifest review. Compressed/expanded bytes and line lengths are bounded. JSON/script characters are escaped. The inert UMD asset loads before helpers; all TV staging targets receive it, and LG uses literal callback substitution to preserve dollar sequences. Raw/intermediate files remain ignored.

Source/catalog fixtures cover explicit classes, adult/video exclusions, TV overlap/mixed-date/missing-set/out-of-universe gates, missing fields, typed collisions, canonical IDs, paging/deduplication, aliases and known new titles. UI smoke covers keyless filters, pagination, search, honest metadata and film controls. Packaged/physical-device verification belongs to the release owner.
