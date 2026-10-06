'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const api = require('../electron/movie-discovery-worker.cjs');
const { createMovieDiscovery } = require('../electron/movie-discovery.cjs');

async function run() {
  const ids = api.parseIds('238\n550\n496243\n129\n100\n101\n');
  assert.throws(() => api.parseIds('238\nbad'));
  const rows = [
    [238, 'The Godfather'], [550, 'Fight Club'], [496243, '기생충'], [129, '千と千尋の神隠し'], [100, 'Remake'], [101, 'Remake']
  ].map(([id, original_title]) => ({ id, original_title, popularity: 10, adult: false, video: false }));
  rows.push({ id: 999, original_title: 'Not listed', popularity: 100, adult: false, video: false });
  const input = rows.map(row => JSON.stringify(row)).join('\r\n');
  const bytes = Buffer.from(input);
  const index = await api.buildIndex(Readable.from([...bytes].map(byte => Buffer.from([byte]))), ids);
  assert.equal(index.movies.length, 6);
  assert.equal(api.search(index, 'The Godfather')[0].tmdb_id, '238');
  assert.equal(api.search(index, 'tmdb:550')[0].title, 'Fight Club');
  assert.equal(api.search(index, '129')[0].title, '千と千尋の神隠し');
  assert.equal(api.search(index, '기생충')[0].tmdb_id, '496243');
  assert.equal(api.search(index, 'Parasite').length, 0);
  assert.equal(api.search(index, 'Remake').length, 2);
  assert.equal(api.search(index, '999').length, 0);
  await assert.rejects(api.buildIndex(Readable.from([Buffer.alloc(50, 65)]), ids, { maxLineBytes: 10 }));
  await assert.rejects(api.buildIndex(Readable.from([bytes]), ids, { maxBytes: 10 }));
  const snapshot = { version: 1, validatedAt: Date.now(), sourceDate: '2026-10-04', providerIds: [...ids],
    movies: index.movies.map(({ tmdb_id, title, popularity }) => ({ tmdb_id, title, popularity })) };
  assert.equal(api.validateCache(snapshot, Date.now()).movies.length, 6);
  assert.throws(() => api.validateCache({ ...snapshot, validatedAt: Date.now() - 8 * 86400000 }, Date.now()));
  assert.throws(() => api.validateCache({ ...snapshot, providerIds: ['238'] }, Date.now()));
  assert.throws(() => api.validateCache({ ...snapshot, movies: [snapshot.movies[0], snapshot.movies[0]] }, Date.now()));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-movie-discovery-test-'));
  const cache = path.join(dir, 'movies-v1.json');
  let manager;
  try {
    fs.writeFileSync(cache, JSON.stringify(snapshot));
    manager = createMovieDiscovery(dir);
    const [first, second] = await Promise.all([manager.query('The Godfather'), manager.query('550')]);
    assert.equal(first.status, 'ready'); assert.equal(first.results[0].tmdb_id, '238');
    assert.equal(second.results[0].tmdb_id, '550');
    assert.equal((await manager.query('x'.repeat(201))).status, 'unavailable');
    assert.equal(fs.readFileSync(cache, 'utf8'), JSON.stringify(snapshot), 'Fresh cache must not download or rewrite');
    manager.close();
    assert.equal((await manager.query('238')).status, 'unavailable');
    manager = createMovieDiscovery(dir, path.join(dir, 'missing-worker.cjs'));
    assert.equal((await manager.query('238')).status, 'unavailable');
    manager.close();
    const wrapper = path.join(dir, 'offline-worker.cjs');
    const entry = require.resolve('../electron/movie-discovery-worker.cjs');
    const requests = path.join(dir, 'requests.jsonl');
    fs.writeFileSync(wrapper, `global.fetch=async url=>{require('node:fs').appendFileSync(${JSON.stringify(requests)},JSON.stringify(url)+'\\n');throw new Error('offline');};require(${JSON.stringify(entry)});`);
    const stale = { ...snapshot, validatedAt: Date.now() - 2 * 86400000 };
    fs.writeFileSync(cache, JSON.stringify(stale));
    manager = createMovieDiscovery(dir, wrapper);
    const staleResult = await manager.query('238'); assert.equal(staleResult.status, 'stale'); assert.equal(staleResult.results[0].tmdb_id, '238');
    assert.equal(fs.readFileSync(cache, 'utf8'), JSON.stringify(stale), 'Refresh failure preserves last good cache');
    await manager.query('550'); assert.equal(fs.readFileSync(requests, 'utf8').trim().split('\n').length, 1, 'Failed refresh has cooldown');
    assert.equal(JSON.parse(fs.readFileSync(requests, 'utf8').trim()), 'https://vidapi.ru/ids/movie_list_tmdb.txt', 'Only fixed bulk URL is sent');
    manager.close();
    fs.writeFileSync(cache, '{bad'); manager = createMovieDiscovery(dir, wrapper);
    assert.equal((await manager.query('238')).status, 'unavailable'); manager.close();
    fs.writeFileSync(cache, ''); fs.truncateSync(cache, 40000001);
    manager = createMovieDiscovery(dir, wrapper); assert.equal((await manager.query('238')).status, 'unavailable'); manager.close();
    fs.writeFileSync(cache, JSON.stringify({ ...snapshot, validatedAt: Date.now() - 8 * 86400000 }));
    manager = createMovieDiscovery(dir, wrapper); assert.equal((await manager.query('238')).status, 'unavailable'); manager.close();
    fs.unlinkSync(cache); manager = createMovieDiscovery(dir, wrapper);
    assert.equal((await manager.query('238')).status, 'unavailable'); manager.close();
    // A trusted test entry wraps the actual worker; production exposes no URL/path override.
    const online = path.join(dir, 'online-worker.cjs');
    fs.writeFileSync(online, `global.fetch=async url=>{const z=require('node:zlib');const ids=${JSON.stringify([...ids].join('\n'))};const rows=${JSON.stringify(input)};return new Response(String(url).includes('movie_list_tmdb')?ids:z.gzipSync(Buffer.from(rows)));};require(${JSON.stringify(entry)});`);
    manager = createMovieDiscovery(dir, online);
    const refreshed = await Promise.all([manager.query('550'), manager.query('129')]);
    assert(refreshed.every(result => result.status === 'ready'));
    assert.equal(refreshed[1].results[0].title, '千と千尋の神隠し');
    assert.equal(api.validateCache(JSON.parse(fs.readFileSync(cache, 'utf8')), Date.now()).movies.length, 6);
    manager.close();
    const death = path.join(dir, 'death-worker.cjs'); fs.writeFileSync(death, 'process.exit(0)');
    manager = createMovieDiscovery(dir, death); assert.equal((await manager.query('238')).status, 'unavailable');
    console.log('Movie discovery: original-title/ID intersection, UTF8 byte limits, shared refresh, cache TTL, stale/offline/corrupt fallback, fixed bulk sources, atomic cache, and worker failure passed.');
  } finally { manager?.close(); await new Promise(resolve => setTimeout(resolve, 100)); fs.rmSync(dir, { recursive: true, force: true }); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
