'use strict';

// Metadata-only discovery. All bulk IO, decoding, indexing, and searches stay in this worker.
const fs = require('node:fs');
const { createGunzip } = require('node:zlib');
const { isMainThread, parentPort, workerData } = require('node:worker_threads');

const MAX_IDS = 150000;
const MAX_ROWS = 2000000;
const MAX_EXPANDED_BYTES = 350000000;
const MAX_LINE_BYTES = 65536;
const idOf = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? String(value) : null;
const normalize = value => String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function parseIds(text) {
  if (Buffer.byteLength(text) > 3000000) throw new Error('Provider ID input exceeds bound.');
  const ids = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const id = idOf(line.trim());
    if (!id) throw new Error('Invalid provider ID.');
    ids.add(id);
    if (ids.size > MAX_IDS) throw new Error('Provider ID count exceeds bound.');
  }
  if (!ids.size) throw new Error('Empty provider ID snapshot.');
  return ids;
}

async function* boundedLines(input, limits = {}) {
  const maxBytes = limits.maxBytes ?? MAX_EXPANDED_BYTES;
  const maxLineBytes = limits.maxLineBytes ?? MAX_LINE_BYTES;
  let bytes = 0, pendingBytes = 0, afterCR = false;
  let parts = [];
  const append = part => {
    pendingBytes += part.length;
    if (pendingBytes > maxLineBytes) throw new Error('Export line byte bound exceeded.');
    if (part.length) parts.push(part);
  };
  const complete = () => {
    const line = Buffer.concat(parts, pendingBytes).toString('utf8');
    parts = []; pendingBytes = 0;
    return line;
  };
  for await (const value of input) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    bytes += chunk.length;
    if (bytes > maxBytes) throw new Error('Export expanded byte bound exceeded.');
    let start = 0;
    for (let offset = 0; offset < chunk.length; offset++) {
      const byte = chunk[offset];
      if (afterCR) {
        afterCR = false;
        if (byte === 10) { start = offset + 1; continue; }
      }
      if (byte === 10 || byte === 13) {
        append(chunk.subarray(start, offset));
        yield { line: complete(), bytes };
        start = offset + 1;
        afterCR = byte === 13;
      } else if (pendingBytes + offset - start + 1 > maxLineBytes) {
        // Reject before any unterminated line is concatenated or decoded.
        throw new Error('Export line byte bound exceeded.');
      }
    }
    append(chunk.subarray(start));
  }
  if (pendingBytes) yield { line: complete(), bytes };
  // Include trailing blank delimiters in exact expanded-byte accounting.
  yield { line: '', bytes };
}

async function buildIndex(input, providerIds, limits) {
  const byId = new Map();
  let rows = 0;
  let bytes = 0;
  const fields = new Set();
  try {
    for await (const entry of boundedLines(input, limits)) {
      const { line } = entry;
      bytes = entry.bytes;
      if (!line.trim()) continue;
      if (++rows > MAX_ROWS) throw new Error('Export row bound exceeded.');
      const movie = JSON.parse(line);
      Object.keys(movie).forEach(key => fields.add(key));
      const id = idOf(movie.id);
      if (!id || typeof movie.original_title !== 'string' || movie.original_title.length > 1000
        || !Number.isFinite(movie.popularity)
        || !(typeof movie.adult === 'boolean' || movie.adult === null)
        || !(typeof movie.video === 'boolean' || movie.video === null)) throw new Error('Invalid export record.');
      if (movie.adult !== false || movie.video !== false || !providerIds.has(id) || !movie.original_title.trim()) continue;
      if (byId.has(id)) throw new Error('Duplicate eligible TMDB ID.');
      byId.set(id, { tmdb_id: id, title: movie.original_title, popularity: movie.popularity, normalized: normalize(movie.original_title) });
    }
  } finally {
    input.destroy();
  }
  // Stable ID, never normalized title, is identity. Remakes and accent collisions survive.
  const movies = [...byId.values()].sort((a, b) => b.popularity - a.popularity || Number(a.tmdb_id) - Number(b.tmdb_id));
  return { movies, byId, rows, bytes, fields: [...fields].sort(), providerIds: providerIds.size };
}

function search(index, query, limit = 20) {
  if (typeof query !== 'string' || query.length > 200 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Invalid query.');
  const exactId = /^(?:tmdb:)?([1-9]\d*)$/.exec(query.trim());
  const clean = movie => ({ tmdb_id: movie.tmdb_id, title: movie.title, popularity: movie.popularity, providerListed: true, playbackStatus: 'not-tested' });
  if (exactId) return index.byId.has(exactId[1]) ? [clean(index.byId.get(exactId[1]))] : [];
  const key = normalize(query);
  if (!key) return [];
  const exact = [], partial = [];
  for (const movie of index.movies) {
    if (movie.normalized === key) exact.push(clean(movie));
    else if (movie.normalized.includes(key) && partial.length < limit) partial.push(clean(movie));
    if (exact.length >= limit) break;
  }
  return exact.concat(partial).slice(0, limit);
}

const path = require('node:path');
const { Readable } = require('node:stream');
const DAY = 86400000;
const MAX_CACHE = 40000000;
let index, sourceDate, validatedAt = 0, retryAfter = 0, building;
const controllers = new Set();
const cacheFile = () => path.join(workerData.cacheDir, 'movies-v1.json');
function validateCache(data, now) {
  if (!data || data.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(data.sourceDate)
      || !Number.isSafeInteger(data.validatedAt) || data.validatedAt > now || now - data.validatedAt > 7 * DAY
      || !Array.isArray(data.movies) || !data.movies.length || data.movies.length > MAX_IDS
      || !Array.isArray(data.providerIds) || data.providerIds.length > MAX_IDS) throw new Error('Invalid movie cache.');
  const ids = parseIds(data.providerIds.join('\n'));
  const byId = new Map();
  const movies = data.movies.map(row => {
    const id = idOf(row.tmdb_id);
    if (!id || !ids.has(id) || byId.has(id) || typeof row.title !== 'string' || !row.title.trim()
        || row.title.length > 1000 || !Number.isFinite(row.popularity)) throw new Error('Invalid cached movie.');
    const movie = { tmdb_id: id, title: row.title, popularity: row.popularity, normalized: normalize(row.title) };
    byId.set(id, movie); return movie;
  });
  movies.sort((a, b) => b.popularity - a.popularity || Number(a.tmdb_id) - Number(b.tmdb_id));
  return { movies, byId };
}
async function readCache() {
  try {
    const file = cacheFile();
    if ((await fs.promises.stat(file)).size > MAX_CACHE) return;
    const chunks = []; let bytes = 0;
    for await (const chunk of fs.createReadStream(file)) {
      bytes += chunk.length;
      if (bytes > MAX_CACHE) throw new Error('Movie cache exceeds bound.');
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks, bytes).toString('utf8'));
    const loaded = validateCache(data, Date.now());
    index = loaded; sourceDate = data.sourceDate; validatedAt = data.validatedAt;
  } catch { /* Invalid snapshots never replace a good in-memory index. */ }
}
async function download(url, bound) {
  const controller = new AbortController(); controllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(url, { redirect: 'error', signal: controller.signal });
    if (!response.ok || Number(response.headers.get('content-length')) > bound) throw new Error('Movie source unavailable.');
    const chunks = []; let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > bound) { controller.abort(); throw new Error('Movie download exceeds bound.'); }
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks, bytes);
  } finally { clearTimeout(timeout); controllers.delete(controller); }
}
async function refresh() {
  const now = new Date();
  if (now.getUTCHours() < 8) now.setUTCDate(now.getUTCDate() - 1);
  const date = now.toISOString().slice(0, 10);
  const [year, month, day] = date.split('-');
  const ids = parseIds((await download('https://vidapi.ru/ids/movie_list_tmdb.txt', 3000000)).toString('utf8'));
  const compressed = await download(`https://files.tmdb.org/p/exports/movie_ids_${month}_${day}_${year}.json.gz`, 60000000);
  const gunzip = createGunzip();
  const input = Readable.from([compressed]); input.on('error', error => gunzip.destroy(error)); input.pipe(gunzip);
  let built;
  try { built = await buildIndex(gunzip, ids); } finally { input.destroy(); gunzip.destroy(); }
  if (!built.movies.length) throw new Error('Empty movie index.');
  const timestamp = Date.now();
  const data = { version: 1, sourceDate: date, validatedAt: timestamp, providerIds: [...ids],
    movies: built.movies.map(({ tmdb_id, title, popularity }) => ({ tmdb_id, title, popularity })) };
  const serialized = JSON.stringify(data);
  if (Buffer.byteLength(serialized) > MAX_CACHE) throw new Error('Movie cache exceeds bound.');
  await fs.promises.mkdir(workerData.cacheDir, { recursive: true });
  const temporary = cacheFile() + '.tmp';
  try { await fs.promises.writeFile(temporary, serialized, { mode: 0o600 }); await fs.promises.rename(temporary, cacheFile()); }
  finally { await fs.promises.unlink(temporary).catch(() => {}); }
  index = built; sourceDate = date; validatedAt = timestamp;
}
async function ensureIndex() {
  if (index && Date.now() - validatedAt < DAY) return;
  if (Date.now() < retryAfter) return;
  if (!building) building = (async () => {
    if (!index) await readCache();
    if (index && Date.now() - validatedAt < DAY) return;
    try { await refresh(); } catch { retryAfter = Date.now() + 300000; }
  })().finally(() => { building = null; });
  await building;
}
async function queryMovies(query) {
  if (typeof query !== 'string' || query.length > 200 || !query.trim()) throw new Error('Invalid movie query.');
  await ensureIndex();
  const usable = index && Date.now() - validatedAt <= 7 * DAY;
  return { status: usable ? (Date.now() - validatedAt < DAY ? 'ready' : 'stale') : 'unavailable',
    sourceDate: usable ? sourceDate : null, results: usable ? search(index, query, 50) : [] };
}
if (!isMainThread) {
  parentPort.on('message', async message => {
    if (message.close) { for (const controller of controllers) controller.abort(); return; }
    try { parentPort.postMessage({ id: message.id, result: await queryMovies(message.query) }); }
    catch { parentPort.postMessage({ id: message.id, result: { status: 'unavailable', sourceDate: null, results: [] } }); }
  });
}
module.exports = { parseIds, boundedLines, buildIndex, search, validateCache };
