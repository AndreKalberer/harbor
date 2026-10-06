# Review-only no-key anime metadata proof

This folder preserves the initial source proof and offline generator normalization. Runtime imports only the compiled shared asset. The raw and intermediate JSON files are ignored; production behavior and eligibility are described in `docs/anime-catalog.md`.

## Source declaration and primary documentation

Wikidata's [licensing policy](https://www.wikidata.org/wiki/Wikidata:Licensing) states that structured data in its main, Property, Lexeme and EntitySchema namespaces is released under CC0. This records the publisher's public declaration; it is not an independent legal guarantee. Do not copy policy prose, Wikipedia articles, images, posters, or Commons media into the dataset.

The query uses Wikidata's [documented public SPARQL endpoint](https://www.wikidata.org/wiki/Wikidata:Data_access#Wikidata_Query_Service), with no account or API key. The [RDF format documentation](https://www.mediawiki.org/wiki/Wikibase/Indexing/RDF_Dump_Format#Truthy_statements) explains the `wdt:` truthy/best-rank projection; it excludes deprecated statements but omits statement qualifiers/references. This proof does not preserve per-entity revisions and must not claim an immutable source revision. A production generator should record retrieval UTC timestamp, exact query, response hash, schema version and source declarations.

Explicit classification comes from direct `P31` [anime television series Q63952888](https://www.wikidata.org/wiki/Q63952888) or [anime film Q20650540](https://www.wikidata.org/wiki/Q20650540). Use [TMDB TV series ID P4983](https://www.wikidata.org/wiki/Property:P4983) only for TV, and [TMDB movie ID P4947](https://www.wikidata.org/wiki/Property:P4947) only for movies. `type + '/' + tmdbId` is the identity key. The property documents warn completeness is always incomplete.

English and Japanese labels retain their languages. A Japanese label is not necessarily the original title. [P1476](https://www.wikidata.org/wiki/Property:P1476) is a language-tagged title; this proof retrieves its Japanese values. [P364](https://www.wikidata.org/wiki/Property:P364) is original language of film or TV show: Q5287 means Japanese. Missing language stays missing. Publication/start timestamps P577/P580 stay raw and may include regional releases, different precision and multiple values. No invented `original_language`, year, rating, overview, artwork, season count or episode count is produced.

## Retrieval and measured scope

Retrieved 2026-10-05 using a single capped 5,000-row full query after one 300-row proof and one aggregate count. Response contained 4,173 rows, 4,172 entities: 3,161 TV mappings and 1,012 movie mappings. Thirteen rows lack English labels; 49 lack P364; 245 lack publication/start dates. The raw response SHA-256 is `9d6e44d5980d19685acabc9f5c541fd272b05848f6289ada73cd5ffee0ba8456` (UTF-8 BOM included).

The conservative prototype accepts 4,145 rows: 3,135 TV and 1,010 movies. It excludes the 13 missing-English rows and quarantines 14 rows in six ambiguous same-type TMDB groups: TV IDs 13549, 20451, 29540, 37508, 39379 and 74191. Some source entities are series subdivisions mapped to the same TMDB root; choosing a title arbitrarily would change identity. Tenchi in Tokyo Q5227700 has both TV/20451 and TV/20485: both are quarantined, accounting for one further rejected row beyond the six collision groups.

Known new examples include Death Note TV/13916 Q718624, Cowboy Bebop TV/30991 Q101244908, Frieren TV/209867 Q115792176, SSSS.Dynazenon TV/96451 Q100050258, Spirited Away movie/129 Q155653, Princess Mononoke movie/128 Q186572, My Neighbor Totoro movie/8392 Q39571 and Made in Abyss: Dawn of the Deep Soul movie/573730 Q100156151. Their English and Japanese labels are in the retrieved response. Spirited Away demonstrates a localized English label; it does not solve aliases for all movie titles.

All seven desktop built-in anime TMDB mappings appear in the accepted set: w-19, w-20, w-21, w-22, w-23, w-24 and w-bleach. Production should index existing built-ins by typed TMDB identity and reuse those IDs and metadata when matched. TV's two built-ins can likewise retain anime-1429 and anime-30984. Do not migrate stored IDs. New metadata identity should follow existing dynamic TMDB conventions after runtime ownership review.

## Limits and proposal

This is explicit Japanese anime classification, not all worldwide animation or all culturally contested anime. OVA/ONA-only, indirect subclass classifications, unmapped works and missing-English works are outside the proof. It is a community-maintained source and can contain classification/mapping errors. No live playback availability was checked or implied; an identifier is metadata, not a licensed stream or provider-listing guarantee.

The resulting implementation uses a separate offline generator, a shared inert metadata snapshot and desktop/TV adapters. No runtime SPARQL, account changes or new dependencies are required. Original classification provenance is retained rather than inventing Japanese-language fields to satisfy TMDB-specific anime predicates. Search can use English/Japanese labels and actual title values; comprehensive aliases need a separate bounded source query and review.

Run `node research/anime-metadata/normalize.test.cjs` for isolated fixtures. They verify movie/TV ID separation, ordinary animation and live-action exclusion, missing field preservation and ambiguous mapping quarantine. Production tests also cover export eligibility and catalog behavior.
