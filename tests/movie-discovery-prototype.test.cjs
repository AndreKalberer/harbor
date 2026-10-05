'use strict';
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { gzipSync, createGunzip } = require('node:zlib');
const { setImmediate: immediate } = require('node:timers/promises');
const { parseIds, buildIndex, search, startWorker } = require('../scripts/movie-discovery-prototype.cjs');
const row = (id, title, extra = {}) => ({ id, original_title: title, adult: false, video: false, popularity: 10, ...extra });
const stream = rows => Readable.from(rows.map(movie => JSON.stringify(movie) + '\n'));
(async () => {
  assert.throws(() => parseIds('42\ninvalid'), /Invalid/);
  assert.throws(() => parseIds('0'), /Invalid/);
  const index = await buildIndex(stream([row(1, 'Dune'), row(2, 'Dune'), row(3, 'Amélie'), row(4, 'Amelie'), row(5, '千と千尋の神隠し'), row(6, 'Adult', { adult: true }), row(7, 'Unknown', { adult: null }), row(8, 'Absent')]), parseIds('1\n2\n3\n4\n5\n6\n7'));
  assert.deepEqual(search(index, 'Dune').map(movie => movie.tmdb_id), ['1', '2']);
  assert.deepEqual(search(index, 'AMELIE').map(movie => movie.tmdb_id), ['3', '4']);
  assert.equal(search(index, '千尋')[0].tmdb_id, '5');
  assert.equal(search(index, 'tmdb:5')[0].title, '千と千尋の神隠し');
  assert.equal(search(index, 'Spirited Away').length, 0); // No invented translation/alias.
  assert.equal(search(index, 'Absent').length, 0);
  assert.equal(search(index, 'Adult').length, 0);
  assert.equal(search(index, 'Unknown').length, 0);
  // Reuse the real renderer formatter without copying its catalog identity logic.
  const renderer = fs.readFileSync(path.join(__dirname, '../app/renderer.js'), 'utf8');
  const start = renderer.indexOf('const formatVidSrcMovie =');
  const end = renderer.indexOf('const loadVidSrcMovieCatalog =', start);
  assert(start >= 0 && end > start);
  const context = vm.createContext({ TMDB_GENRE_LABELS: {} });
  vm.runInContext(renderer.slice(start, end) + '\nthis.formatMovie = formatVidSrcMovie;', context);
  const formatted = search(index, 'Dune').map(context.formatMovie);
  assert.deepEqual(formatted.map(movie => movie.id), ['vidsrc-movie-1', 'vidsrc-movie-2']);
  assert.equal(formatted[0].preferredProviderId, 'vidapi');
  assert.equal(formatted[0].year, '');
  assert.equal(formatted[0].artworkUrl, '');
  assert.throws(() => search(index, 'x'.repeat(201)), /Invalid/);
  await assert.rejects(buildIndex(stream([row(1, 'First'), row(1, 'Conflicting')]), parseIds('1')), /Duplicate/);
  await assert.rejects(buildIndex(Readable.from(['invalid\n']), parseIds('1')), SyntaxError);
  // One-byte chunks split every Unicode code point and CR/LF pair, including a
  // final record without newline. Byte count must match the original input.
  const unicode = Buffer.from(JSON.stringify(row(1, '千尋 🎬 Amélie')) + '\r\n' + JSON.stringify(row(2, 'Dune')) + '\r' + JSON.stringify(row(3, '最後')));
  const unicodeIndex = await buildIndex(Readable.from(Array.from(unicode, byte => Buffer.from([byte]))), parseIds('1\n2\n3'));
  assert.equal(unicodeIndex.bytes, unicode.length);
  assert.equal(search(unicodeIndex, 'tmdb:1')[0].title, '千尋 🎬 Amélie');
  assert.equal(search(unicodeIndex, '最後')[0].tmdb_id, '3');

  async function inflationRegression(payload, limits, expectedError) {
    const compressed = gzipSync(payload);
    let compressedBytesSent = 0, reachedEOF = false, expandedBytesSeen = 0;
    const source = Readable.from((async function* () {
      for (let offset = 0; offset < compressed.length; offset += 32) {
        await immediate();
        const chunk = compressed.subarray(offset, offset + 32);
        compressedBytesSent += chunk.length;
        yield chunk;
      }
      reachedEOF = true;
    })());
    const gunzip = createGunzip();
    source.on('error', error => gunzip.destroy(error));
    gunzip.on('data', chunk => { expandedBytesSeen += chunk.length; });
    source.pipe(gunzip);
    try { await assert.rejects(buildIndex(gunzip, parseIds('1'), limits), expectedError); }
    finally { source.destroy(); gunzip.destroy(); }
    assert.equal(gunzip.readableEnded, false, 'Reject before inflated EOF');
    assert.equal(reachedEOF, false, 'Reject before compressed source EOF');
    assert(compressedBytesSent < compressed.length, 'Stop upstream before all compressed bytes');
    assert(expandedBytesSeen < payload.length, 'Never decode/consume the full inflated payload');
    assert(source.destroyed && gunzip.destroyed, 'Both pipeline stages must close');
  }
  await inflationRegression(Buffer.alloc(1024 * 1024, 120), undefined, /line byte bound/);
  // Valid short records exceed a small injected total bound. Test the same total
  // guard without generating the full production 350MB inflation ceiling.
  const records = Buffer.from((JSON.stringify(row(1, 'Excluded', { adult: true })) + '\n').repeat(10000));
  await inflationRegression(records, { maxBytes: 4096 }, /expanded byte bound/);
  let giantSourceEOF = false;
  const giantSource = Readable.from((async function* () {
    yield Buffer.alloc(409600, 120);
    await immediate();
    giantSourceEOF = true;
    yield Buffer.from('\n');
  })());
  await assert.rejects(buildIndex(giantSource, parseIds('1')), /line byte bound/);
  assert.equal(giantSourceEOF, false, 'Reject a large chunk before waiting for line EOF');
  assert(giantSource.destroyed);

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-discovery-fixture-'));
  try {
    const idsPath = path.join(directory, 'ids.txt'), exportPath = path.join(directory, 'movies.gz');
    fs.writeFileSync(idsPath, '1');
    fs.writeFileSync(exportPath, gzipSync(JSON.stringify(row(1, 'Worker title')) + '\n'));
    const client = await startWorker(exportPath, idsPath);
    try {
      assert.equal((await client.query('Worker title')).results[0].tmdb_id, '1');
      assert.match((await client.query('x'.repeat(201))).error, /Invalid query/);
    } finally { await client.close(); }
    await assert.rejects(client.query('Worker title'), /closed/);
    fs.writeFileSync(exportPath, 'invalid gzip');
    await assert.rejects(startWorker(exportPath, idsPath), /header|gzip/i);
    fs.writeFileSync(exportPath, gzipSync(Buffer.alloc(1024 * 1024, 120)));
    await assert.rejects(startWorker(exportPath, idsPath), /line byte bound/);
    fs.writeFileSync(idsPath, 'invalid');
    await assert.rejects(startWorker(exportPath, idsPath), /Invalid provider ID/);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert(path.basename(directory).startsWith('harbor-discovery-fixture-'));
    fs.rmSync(directory, { recursive: true, force: true });
  }
  console.log('Movie discovery metadata fixtures passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
