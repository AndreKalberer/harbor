'use strict';
const { Worker } = require('node:worker_threads');
const path = require('node:path');

function createMovieDiscovery(cacheDir, workerEntry = path.join(__dirname, 'movie-discovery-worker.cjs')) {
  let worker, serial = 0, closed = false;
  const pending = new Map();
  const unavailable = () => ({ status: 'unavailable', sourceDate: null, results: [] });
  const fail = () => {
    for (const request of pending.values()) { clearTimeout(request.timer); request.resolve(unavailable()); }
    pending.clear(); worker = null;
  };
  function query(query) {
    if (closed || typeof query !== 'string' || !query.trim() || query.length > 200 || pending.size >= 16) return Promise.resolve(unavailable());
    if (!worker) {
      try {
        const active = new Worker(workerEntry, { workerData: { cacheDir }, resourceLimits: { maxOldGenerationSizeMb: 512 } });
        worker = active;
        active.on('message', message => {
          const request = pending.get(message.id);
          if (!request) return;
          pending.delete(message.id); clearTimeout(request.timer);
          const result = message.result;
          const valid = result && ['ready', 'stale', 'unavailable'].includes(result.status)
            && (result.sourceDate === null || /^\d{4}-\d{2}-\d{2}$/.test(result.sourceDate))
            && Array.isArray(result.results) && result.results.length <= 50
            && result.results.every(row => /^[1-9]\d*$/.test(row.tmdb_id) && Number.isSafeInteger(Number(row.tmdb_id))
              && typeof row.title === 'string' && row.title.length <= 1000 && row.providerListed === true && row.playbackStatus === 'not-tested');
          request.resolve(valid ? result : unavailable());
        });
        active.on('error', () => { if (worker === active) fail(); });
        active.on('exit', () => { if (worker === active) fail(); });
      } catch { return Promise.resolve(unavailable()); }
    }
    return new Promise(resolve => {
      const id = ++serial;
      const timer = setTimeout(() => { const active = worker; fail(); active?.terminate(); }, 270000);
      pending.set(id, { resolve, timer });
      worker.postMessage({ id, query });
    });
  }
  return { query, close() { closed = true; const active = worker; active?.postMessage({ close: true }); fail(); active?.terminate(); } };
}
module.exports = { createMovieDiscovery };
