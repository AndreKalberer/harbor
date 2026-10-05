'use strict';

// Isolated metadata experiment. No renderer integration, network, or player URLs.
const fs = require('node:fs');
const { createGunzip } = require('node:zlib');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const { performance } = require('node:perf_hooks');
const { createHash } = require('node:crypto');

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

async function startWorker(exportPath, idsPath) {
  if (fs.statSync(exportPath).size > 60000000 || fs.statSync(idsPath).size > 3000000) throw new Error('Input file size exceeds bound.');
  const worker = new Worker(__filename, { workerData: { exportPath, idsPath } });
  let nextId = 0;
  let closed = false;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    worker.on('message', message => {
      if (message.ready) resolve(message);
      else if (pending.has(message.id)) { pending.get(message.id).resolve(message); pending.delete(message.id); }
    });
    worker.on('error', error => { closed = true; reject(error); for (const entry of pending.values()) entry.reject(error); pending.clear(); });
    worker.on('exit', code => {
      closed = true;
      reject(new Error('Index worker exited before completion (code ' + code + ').'));
      for (const entry of pending.values()) entry.reject(new Error('Index worker exited.'));
      pending.clear();
    });
  });
  let metadata;
  try { metadata = await ready; }
  catch (error) { await worker.terminate(); throw error; }
  return { metadata, query: query => new Promise((resolve, reject) => {
    if (closed) { reject(new Error('Index worker is closed.')); return; }
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, query });
  }), close: () => { closed = true; return worker.terminate(); } };
}

if (!isMainThread) {
  (async () => {
    const started = performance.now();
    const idsText = fs.readFileSync(workerData.idsPath, 'utf8');
    const providerIds = parseIds(idsText);
    const compressed = fs.createReadStream(workerData.exportPath);
    const gunzip = createGunzip();
    compressed.on('error', error => gunzip.destroy(error));
    compressed.pipe(gunzip);
    let index;
    try { index = await buildIndex(gunzip, providerIds); }
    finally { compressed.destroy(); gunzip.destroy(); }
    parentPort.postMessage({ ready: true, rows: index.rows, indexed: index.movies.length, fields: index.fields,
      expandedBytes: index.bytes, buildMs: performance.now() - started, memory: process.memoryUsage(),
      providerIds: index.providerIds, providerSha256: createHash('sha256').update(idsText).digest('hex') });
    parentPort.on('message', ({ id, query }) => {
      const started = performance.now();
      try { parentPort.postMessage({ id, results: search(index, query), searchMs: performance.now() - started }); }
      catch (error) { parentPort.postMessage({ id, error: error.message }); }
    });
  })().catch(error => { throw error; });
}

module.exports = { normalize, parseIds, buildIndex, search, startWorker };
