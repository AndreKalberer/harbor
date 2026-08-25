const assert = require('node:assert/strict');
const {
  normalizeSeriesSeasons,
  clampSelection,
  stepSelection
} = require('../shared/series-metadata.js');

const bleach = normalizeSeriesSeasons({ seasons: [
  { season_number: 0, name: 'Specials', episode_count: 4 },
  { season_number: 1, name: 'Bleach', episode_count: 366, air_date: '2004-10-05' },
  { season_number: 2, name: 'Thousand-Year Blood War', episode_count: 50, air_date: '2022-10-11' }
] });

assert.deepEqual(bleach.map((season) => [season.number, season.name, season.episodeCount]), [
  [1, 'Bleach', 366],
  [2, 'Thousand-Year Blood War', 50]
]);
assert.deepEqual(clampSelection(bleach, 1, 999), { season: 1, episode: 366, episodeCount: 366 });
assert.deepEqual(stepSelection(bleach, 1, 366, 1), { season: 2, episode: 1 });
assert.deepEqual(stepSelection(bleach, 2, 1, -1), { season: 1, episode: 366 });
assert.equal(stepSelection(bleach, 2, 50, 1), null);

const shortSeason = normalizeSeriesSeasons({ seasons: [
  { season_number: 1, name: 'Limited Series', episode_count: 6 }
] });
assert.equal(shortSeason[0].episodeCount, 6);
assert.equal(stepSelection(shortSeason, 1, 6, 1), null);

process.stdout.write('Series metadata behavior verified.\n');
