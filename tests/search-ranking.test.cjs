const assert = require('node:assert/strict');
const { searchScore } = require('../shared/search-ranking.js');

const fixtures = [
  { name: 'Solo Leveling Light Novel', category: 'Read', type: 'book', sections: ['Light Novels'], overview: 'Action fantasy' },
  { name: 'Demon Slayer: Kimetsu no Yaiba', category: 'Watch', type: 'anime', sections: ['Anime'], overview: 'Action anime' },
  { name: 'Attack on Titan', category: 'Watch', type: 'anime', sections: ['Anime'], overview: 'Humanity fights for survival.' },
  { name: 'Interstellar', category: 'Watch', type: 'movie', sections: ['Movies'], overview: 'Explorers travel through a wormhole.' },
  { name: 'Interstellar', category: 'Listen', type: 'podcast', sections: ['Podcasts'], overview: 'A film discussion.' },
  { name: 'Interstellar - Kuzu Mellow', category: 'Listen', type: 'music', sections: ['Music', 'Interstellar'], overview: 'A single.' }
];

assert.equal(fixtures.filter((item) => searchScore(item, 'zzzz-no-results-lead') > 0).length, 0, 'Nonsense query returned unrelated items.');
assert.equal(fixtures.filter((item) => searchScore(item, 'Attack on Titan') > 0).map((item) => item.name).join(','), 'Attack on Titan', 'Exact title search returned unrelated items.');
assert.equal(searchScore(fixtures[0], 'no'), 0, 'Short token matched inside an unrelated word.');
assert.ok(searchScore(fixtures[1], 'anime') > 0, 'Exact metadata words should remain searchable.');
const interstellar = fixtures
  .filter((item) => searchScore(item, 'Interstellar') > 0)
  .sort((a, b) => searchScore(b, 'Interstellar') - searchScore(a, 'Interstellar'));
assert.equal(interstellar[0].type, 'movie', 'An exact Watch title should outrank partial metadata matches and exact non-Watch duplicates in Home search.');
assert.ok(searchScore(interstellar[1], 'Interstellar') > searchScore(interstellar[2], 'Interstellar'), 'Exact titles should outrank partial title or metadata matches.');

process.stdout.write('Search relevance behavior verified.\n');
