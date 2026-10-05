#!/usr/bin/env node
'use strict';

// Metadata only: no player URLs are opened and no credentials are required.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { Readable } = require('node:stream');
const { createGunzip } = require('node:zlib');
const { createHash } = require('node:crypto');

const PROVIDER_IDS_URL = 'https://vidapi.ru/ids/movie_list_tmdb.txt';
const PROVIDER_PAGE_URL = 'https://vidapi.ru/movies/latest/page-1.json';

function numericId(value) {
  const id = String(value ?? '').trim();
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? id : null;
}

function exportUrl(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) {
    throw new Error('Export date must be a valid YYYY-MM-DD date.');
  }
  const [year, month, day] = date.split('-');
  return `https://files.tmdb.org/p/exports/movie_ids_${month}_${day}_${year}.json.gz`;
}

function parseIds(text) {
  const ids = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const id = numericId(line);
    if (!id) throw new Error('Provider ID list contains an invalid movie ID.');
    ids.add(id);
  }
  if (!ids.size) throw new Error('Provider ID list is empty.');
  return ids;
}

async function topMovies(input, count) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 10000) throw new Error('Sample size must be 1–10000.');
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  const top = [];
  const topIds = new Set();
  let scanned = 0;
  let excludedUnknownFlags = 0;
  const hash = createHash('sha256');
  const compare = (a, b) => b.popularity - a.popularity || Number(a.id) - Number(b.id);
  try {
    for await (const line of lines) {
      hash.update(line + '\n');
      if (!line.trim()) continue;
      let movie;
      try { movie = JSON.parse(line); } catch { throw new Error('TMDB export contains invalid JSON.'); }
      scanned++;
      const id = numericId(movie.id);
      if (!id || !(typeof movie.adult === 'boolean' || movie.adult === null) || !(typeof movie.video === 'boolean' || movie.video === null)
          || typeof movie.popularity !== 'number' || !Number.isFinite(movie.popularity)) {
        throw new Error('TMDB export contains an unexpected movie record.');
      }
      // Real exports include null flags on some records. Unknown eligibility
      // is excluded rather than treated as proof the record is non-adult/video.
      if (movie.adult === null || movie.video === null) { excludedUnknownFlags++; continue; }
      if (movie.adult || movie.video || topIds.has(id)) continue;
      const candidate = { id, title: String(movie.original_title || '').slice(0, 300), popularity: movie.popularity };
      if (top.length === count && compare(candidate, top[top.length - 1]) >= 0) continue;
      top.push(candidate);
      topIds.add(id);
      top.sort(compare);
      if (top.length > count) topIds.delete(top.pop().id);
    }
  } finally { lines.close(); }
  if (top.length < count) throw new Error(`TMDB export has fewer than ${count} eligible distinct movies.`);
  return { movies: top, scanned, excludedUnknownFlags, normalizedSha256: hash.digest('hex') };
}

function compareCoverage(movies, providerIds, initialIds = new Set(), builtinIds = new Set()) {
  return movies.map((movie, index) => ({
    rank: index + 1, ...movie,
    providerListed: providerIds.has(movie.id),
    initialProviderPageListed: initialIds.has(movie.id),
    desktopBuiltinListed: builtinIds.has(movie.id),
    playbackStatus: 'not-tested',
    searchStatus: 'not-tested'
  }));
}

async function fetchResponse(url) {
  let response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(120000) }); }
  catch { throw new Error(`Metadata download failed for ${new URL(url).hostname}.`); }
  if (!response.ok) throw new Error(`Metadata download returned HTTP ${response.status} for ${new URL(url).hostname}.`);
  return response;
}

async function run(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i];
    if (!['--date', '--count', '--output', '--tmdb-export'].includes(name) || !args[i + 1] || options[name]) {
      throw new Error('Usage: node scripts/movie-coverage-audit.cjs --date YYYY-MM-DD [--count 500] [--tmdb-export cached.json.gz] --output path.json');
    }
    options[name] = args[i + 1];
  }
  if (!options['--date'] || !options['--output']) throw new Error('--date and --output are required; choose an available daily export.');
  const count = Number(options['--count'] || 500);
  if (!Number.isSafeInteger(count) || count < 1 || count > 10000) throw new Error('Sample size must be 1–10000.');
  const url = exportUrl(options['--date']);
  const startedAt = new Date().toISOString();
  // A bounded three-request audit, rather than crawling thousands of latest pages.
  const [exportResponse, idsResponse, pageResponse] = await Promise.all([
    options['--tmdb-export'] ? null : fetchResponse(url), fetchResponse(PROVIDER_IDS_URL), fetchResponse(PROVIDER_PAGE_URL)
  ]);
  const compressed = options['--tmdb-export'] ? fs.readFileSync(options['--tmdb-export']) : Buffer.from(await exportResponse.arrayBuffer());
  const exportHash = createHash('sha256').update(compressed).digest('hex');
  const stream = Readable.from([compressed]);
  const gunzip = stream.pipe(createGunzip());
  // Propagate decompression errors to the line reader instead of crashing Node.
  const sampled = await topMovies(gunzip, count);
  const idsText = await idsResponse.text();
  const providerIds = parseIds(idsText);
  const pageText = await pageResponse.text();
  const firstPage = JSON.parse(pageText);
  if (!Array.isArray(firstPage.items) || !firstPage.items.length || Number(firstPage.page) !== 1
      || !Number.isSafeInteger(Number(firstPage.total)) || Number(firstPage.total) < firstPage.items.length
      || !Number.isSafeInteger(Number(firstPage.total_pages)) || Number(firstPage.total_pages) < 1
      || firstPage.items.some(item => !numericId(item.tmdb_id))) throw new Error('Provider page 1 returned an unexpected response.');
  const initialIds = new Set(firstPage.items.map(item => numericId(item.tmdb_id)));
  const builtins = require('../app/catalog-data.js').filter(item => item.type === 'movie');
  const builtinIds = new Set(builtins.map(item => numericId(item.tmdbId)).filter(Boolean));
  const movies = compareCoverage(sampled.movies, providerIds, initialIds, builtinIds);
  const report = {
    schemaVersion: 1, startedAt, completedAt: new Date().toISOString(), exportDate: options['--date'],
    cohort: 'TMDB daily-export non-adult non-video movie IDs, descending popularity; numeric ID breaks ties',
    sources: {
      tmdbExport: { url, inputMode: options['--tmdb-export'] ? 'cached-file' : 'live-download', compressedSha256: exportHash,
        normalizedSha256: sampled.normalizedSha256, recordsScanned: sampled.scanned, excludedUnknownFlags: sampled.excludedUnknownFlags },
      providerIds: { url: PROVIDER_IDS_URL, sha256: createHash('sha256').update(idsText).digest('hex'), distinctIds: providerIds.size },
      providerInitialPage: { url: PROVIDER_PAGE_URL, sha256: createHash('sha256').update(pageText).digest('hex'),
        totalReported: Number(firstPage.total), totalPagesReported: Number(firstPage.total_pages), distinctIds: initialIds.size },
      desktopBuiltins: { path: 'app/catalog-data.js', sha256: createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../app/catalog-data.js'))).digest('hex'), distinctMovieIds: builtinIds.size }
    },
    summary: {
      sampleSize: movies.length,
      providerListed: movies.filter(movie => movie.providerListed).length,
      providerNotListed: movies.filter(movie => !movie.providerListed).length,
      initialProviderPageListed: movies.filter(movie => movie.initialProviderPageListed).length,
      desktopBuiltinListed: movies.filter(movie => movie.desktopBuiltinListed).length,
      verifiedPlayback: 0, verifiedSearch: 0
    },
    limitations: [
      'Provider ID membership is metadata evidence only; playback and search are not tested.',
      'Absence means not listed in this provider snapshot, not unavailable from every provider.',
      'Popularity is time-dependent and biased toward current interest; this is not a complete film canon.',
      'Daily export attributes cannot identify unreleased films, shorts, language, or regional availability.',
      'Records with null adult/video eligibility flags are excluded conservatively.',
      'TMDB original titles may differ from localized display/search titles.',
      'Snapshots are downloaded independently and may differ in freshness.',
      'First-page and built-in matches are visibility indicators, not UI or search end-to-end verification.'
    ],
    movies
  };
  const output = path.resolve(options['--output']);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, ...report.summary }));
  return report;
}

module.exports = { numericId, exportUrl, parseIds, topMovies, compareCoverage, run };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
