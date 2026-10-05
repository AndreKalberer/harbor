'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { startWorker } = require('./movie-discovery-prototype.cjs');

// Offline inputs required: matching dated export, provider list, prior audit.
(async () => {
  const [exportPath, idsPath, auditPath, outputPath] = process.argv.slice(2);
  if (!exportPath || !idsPath || !auditPath || !outputPath) throw new Error('Provide export, provider ID list, audit, output paths.');
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const probes = audit.movies.filter(movie => movie.providerListed && !movie.initialProviderPageListed && !movie.desktopBuiltinListed).slice(0, 5);
  const beforeCpu = process.cpuUsage();
  const started = performance.now();
  let ticks = 0, maxTickGapMs = 0, lastTick = started;
  const heartbeat = setInterval(() => {
    const now = performance.now();
    maxTickGapMs = Math.max(maxTickGapMs, now - lastTick);
    lastTick = now; ticks++;
  }, 10);
  let client;
  try {
    client = await startWorker(exportPath, idsPath);
    const observations = [];
    for (const movie of probes) {
      const start = performance.now();
      const result = await client.query(movie.title);
      observations.push({ query: movie.title, expectedId: movie.id, found: result.results.some(item => item.tmdb_id === movie.id),
        baselineBuiltinListed: false, baselineInitialPageListed: false, roundtripMs: performance.now() - start, ...result });
    }
    const foreign = [];
    for (const query of ['기생충', 'Parasite', 'tmdb:496243', '千と千尋の神隠し', 'Spirited Away', 'tmdb:129', 'Le Fabuleux Destin d’Amélie Poulain', 'Amelie', 'tmdb:194']) {
      foreign.push({ query, ...await client.query(query) });
    }
    const timings = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await client.query(['unlikely movie match xyz', 'the', 'tmdb:129', 'dune'][i % 4]);
      timings.push(performance.now() - start);
    }
    timings.sort((a, b) => a - b);
    const report = { generatedAt: new Date().toISOString(), exportPath, providerPath: idsPath,
      cacheNote: 'TMDB cached export reused; provider list independently captured, may differ from audit snapshot.',
      metadata: client.metadata, heartbeat: { intervalMs: 10, ticks, maxTickGapMs },
      totalMs: performance.now() - started, cpuMicroseconds: process.cpuUsage(beforeCpu),
      queryRoundtrip: { count: timings.length, medianMs: timings[50], p95Ms: timings[94], maxMs: timings[99] },
      observations, foreign, playbackStatus: 'not-tested', uiStatus: 'not-integrated' };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ indexed: report.metadata.indexed, buildMs: report.metadata.buildMs,
      queryRoundtrip: report.queryRoundtrip, heartbeat: report.heartbeat,
      unloadedProbesFound: observations.filter(item => item.found).length,
      foreign: foreign.map(({ query, results }) => ({ query, ids: results.map(movie => movie.tmdb_id) })) }, null, 2));
  } finally {
    clearInterval(heartbeat);
    if (client) await client.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
