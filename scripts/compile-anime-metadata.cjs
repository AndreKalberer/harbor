'use strict';
// Manual, offline-only compilation. Never performs a network request.
const fs = require('node:fs');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { normalize } = require('../research/anime-metadata/normalize.cjs');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function parseExport(bytes) {
  if (bytes.length > 60000000) throw new Error('Compressed export exceeds bound.');
  const text = zlib.gunzipSync(bytes, { maxOutputLength: 300000000 }).toString('utf8');
  const byId = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (line.length > 10000) throw new Error('Export row exceeds bound.');
    const row = JSON.parse(line);
    if (!Number.isSafeInteger(row.id) || row.id < 1 || byId.has(String(row.id))) throw new Error('Invalid/duplicate export ID.');
    byId.set(String(row.id), row);
  }
  return byId;
}
function compile(bindings, movies, series, adultSeries, dates) {
  const normalized = normalize(bindings, '2026-10-05');
  const tvInference = adultSeries instanceof Map && adultSeries.size > 0 && series.size > 0
    && dates && /^\d{4}-\d{2}-\d{2}$/.test(dates.tv) && dates.tv === dates.adultTv;
  const rows = [], excluded = [];
  for (const row of normalized.rows) {
    const exportRow = (row.type === 'movie' ? movies : series).get(row.tmdbId);
    // Unknown adult status is excluded, never coerced to false.
    const tvEligible = row.type === 'tv' && tvInference && series.has(row.tmdbId) && !adultSeries.has(row.tmdbId);
    const rawEligible = row.type === 'movie' && exportRow && exportRow.adult === false;
    if (!exportRow || (!tvEligible && !rawEligible) || (row.type === 'movie' && exportRow.video !== false)) {
      excluded.push({ entityId: row.entityId, type: row.type, tmdbId: row.tmdbId, reason: 'adult-video-eligibility-unconfirmed-or-blocked' });
      continue;
    }
    rows.push({ ...row, adult: false, adultEligibility: tvEligible ? 'derived-ordinary-minus-adult-TV-export' : 'explicit-movie-export-flag', video: row.type === 'movie' ? false : null,
      popularity: Number.isFinite(exportRow.popularity) ? exportRow.popularity : null });
  }
  return { rows, rejected: normalized.rejected, excluded };
}
if (require.main === module) {
  const [snapshotPath, moviePath, tvPath, adultTvPath, outputPath] = process.argv.slice(2);
  if (!outputPath) throw new Error('Usage: node scripts/compile-anime-metadata.cjs <wikidata.json> <movie.gz> <tv.gz> <adult-tv.gz> <output.js>');
  const raw = fs.readFileSync(snapshotPath), movieBytes = fs.readFileSync(moviePath), tvBytes = fs.readFileSync(tvPath), adultTvBytes = fs.readFileSync(adultTvPath);
  const expected = { movie: 'd6f857c72cb67a45068b0a4f2d3c8159593eb75ad1fa474be433aa8d6c275e9c', tv: 'b5f2435e229f7b920bc331ed3734dc6e72b6c084d9561502a267a59dfb829598', adultTv: '2ca3a5b923772d394794aa37a8e01aea13b064e70e95b1ffaabc526a17857a13' };
  if(raw.length>20000000||sha256(raw)!=='9d6e44d5980d19685acabc9f5c541fd272b05848f6289ada73cd5ffee0ba8456') throw new Error('Wikidata response differs from reviewed bounded snapshot.');
  if (sha256(movieBytes)!==expected.movie||sha256(tvBytes)!==expected.tv||sha256(adultTvBytes)!==expected.adultTv) throw new Error('Snapshot hash/date binding differs from reviewed export manifest. Review a new manifest before compiling.');
  const series = parseExport(tvBytes), adults = parseExport(adultTvBytes);
  for (const map of [series, adults]) for (const row of map.values()) if(typeof row.original_name!=='string'||!Number.isFinite(row.popularity)) throw new Error('Invalid TV export schema.');
  const data = compile(JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, '')).results.bindings, parseExport(movieBytes), series, adults, { tv:'2026-10-04', adultTv:'2026-10-04' });
  const provenance = { schemaVersion: 1, sourceDate: '2026-10-05', scope: 'direct-class-anime-with-reviewed-adult-video-export-eligibility',
    wikidataEntityDate: '2026-10-05', tmdbExportDate: '2026-10-04',
    wikidataLicenseDeclaration: 'https://www.wikidata.org/wiki/Wikidata:Licensing',
    wikidataSha256: sha256(raw), querySha256: sha256(fs.readFileSync('research/anime-metadata/query.sparql')),
    tmdbExportDocumentation: 'https://developer.themoviedb.org/docs/daily-id-exports',
    movieUrl: 'https://files.tmdb.org/p/exports/movie_ids_10_04_2026.json.gz',
    tvUrl: 'https://files.tmdb.org/p/exports/tv_series_ids_10_04_2026.json.gz',
    adultTvUrl: 'https://files.tmdb.org/p/exports/adult_tv_series_ids_10_04_2026.json.gz', adultTvSha256:sha256(adultTvBytes),
    movieSha256: sha256(movieBytes), tvSha256: sha256(tvBytes),
    eligibility: 'Movie rows require explicit adult=false AND video=false. TV eligibility is inferred from same-date ordinary union adult universe, ordinary membership minus adult IDs; no TV video flag inferred.',
    sourceRowCount: 4173, metadataCandidateCount: 4145, includedCount: data.rows.length };
  const literal = JSON.stringify({ provenance, rows: data.rows }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  fs.writeFileSync(outputPath, '(function(root,factory){var data=factory();if(typeof module==="object"&&module.exports)module.exports=data;if(root)root.HarborAnimeMetadata=data;})(typeof globalThis!=="undefined"?globalThis:this,function(){"use strict";return ' + literal + ';});\n');
  console.log(JSON.stringify({ accepted: data.rows.length, excluded: data.excluded.length, quarantines: data.rejected.length }));
}
module.exports = { compile, parseExport };
