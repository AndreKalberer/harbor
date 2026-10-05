'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { gzipSync } = require('node:zlib');
const audit = require('../scripts/movie-coverage-audit.cjs');
const lineStream = rows => Readable.from([rows.map(row => JSON.stringify(row)).join('\n')]);
const movie = (id, popularity, extra = {}) => ({ id, popularity, original_title: 'Movie ' + id, adult: false, video: false, ...extra });

async function run() {
  assert.equal(audit.exportUrl('2026-10-04'), 'https://files.tmdb.org/p/exports/movie_ids_10_04_2026.json.gz');
  for (const value of ['2026-02-30', 'today', '2026-13-01']) assert.throws(() => audit.exportUrl(value));
  for (const id of [0, -1, 'tt123', '12.5', Number.MAX_SAFE_INTEGER + 1, '1e3']) assert.equal(audit.numericId(id), null);
  assert.deepEqual([...audit.parseIds('12\r\n13\n12\n')], ['12', '13']);
  assert.throws(() => audit.parseIds('<html>failure</html>'));
  assert.throws(() => audit.parseIds('\n'));

  const sampled = await audit.topMovies(lineStream([
    movie(3, 2), movie(10, 4), movie(2, 4), movie(1, 999, { adult: true }),
    movie(5, 999, { video: true }), movie(10, 4), movie(6, 1), movie(99, 999, { video: null })
  ]), 3);
  assert.deepEqual(sampled.movies.map(m => m.id), ['2', '10', '3']);
  assert.equal(sampled.scanned, 8);
  assert.equal(sampled.excludedUnknownFlags, 1);
  await assert.rejects(audit.topMovies(lineStream([movie(1, 1)]), 2), /fewer/);
  await assert.rejects(audit.topMovies(Readable.from(['not json']), 1), /invalid JSON/);
  await assert.rejects(audit.topMovies(lineStream([movie(1, 'oops')]), 1), /unexpected/);
  await assert.rejects(audit.topMovies(lineStream([movie(1, 1, { adult: undefined })]), 1), /unexpected/);
  const coverage = audit.compareCoverage(sampled.movies, new Set(['2']), new Set(['10']), new Set(['3']));
  assert.equal(coverage[0].providerListed, true);
  assert.equal(coverage[1].providerListed, false);
  assert.equal(coverage[1].initialProviderPageListed, true);
  assert.equal(coverage[2].desktopBuiltinListed, true);
  assert(coverage.every(m => m.playbackStatus === 'not-tested' && m.searchStatus === 'not-tested'));

  const originalFetch = global.fetch;
  const originalLog = console.log;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-movie-audit-'));
  const output = path.join(temporary, 'report.json');
  const requests = [];
  const exportBytes = gzipSync([movie(157336, 9), movie(9999999, 8)].map(m => JSON.stringify(m)).join('\n'));
  try {
    console.log = () => {};
    global.fetch = async url => {
      requests.push(url);
      return new Response(url.endsWith('.gz') ? exportBytes : url.endsWith('.txt') ? '157336\n'
        : JSON.stringify({ page: 1, total: 1, total_pages: 1, items: [{ tmdb_id: '157336' }] }));
    };
    const report = await audit.run(['--date', '2026-10-04', '--count', '2', '--output', output]);
    assert.equal(requests.length, 3, 'Bounded audit must not crawl every page or open players');
    assert.deepEqual(report.summary, { sampleSize: 2, providerListed: 1, providerNotListed: 1,
      initialProviderPageListed: 1, desktopBuiltinListed: 1, verifiedPlayback: 0, verifiedSearch: 0 });
    assert.equal(JSON.parse(fs.readFileSync(output)).movies.length, 2);
    assert.equal(report.sources.tmdbExport.compressedSha256.length, 64);
    const cache = path.join(temporary, 'cached.json.gz');
    fs.writeFileSync(cache, exportBytes);
    requests.length = 0;
    const cachedReport = await audit.run(['--date', '2026-10-04', '--count', '2', '--output', output, '--tmdb-export', cache]);
    assert.equal(requests.length, 2, 'Cached export must skip its network download');
    assert.equal(cachedReport.sources.tmdbExport.inputMode, 'cached-file');
    assert.equal(cachedReport.sources.tmdbExport.compressedSha256, report.sources.tmdbExport.compressedSha256);
    fs.unlinkSync(output);
    global.fetch = async () => new Response('Unavailable', { status: 503 });
    await assert.rejects(audit.run(['--date', '2026-10-04', '--output', output]), /HTTP 503/);
    assert.equal(fs.existsSync(output), false, 'Failed source downloads must not create a misleading report');
    global.fetch = async url => new Response(url.endsWith('.gz') ? 'broken gzip'
      : url.endsWith('.txt') ? '157336' : JSON.stringify({ page: 1, items: [] }));
    await assert.rejects(audit.run(['--date', '2026-10-04', '--count', '1', '--output', output]));
    assert.equal(fs.existsSync(output), false);
  } finally {
    global.fetch = originalFetch;
    console.log = originalLog;
    fs.rmSync(temporary, { recursive: true, force: true });
  }
  console.log('Movie audit ranking, identities, exclusions, coverage semantics, bounded downloads, and failure handling verified.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
