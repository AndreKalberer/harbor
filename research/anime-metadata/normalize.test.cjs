'use strict';
const assert = require('node:assert/strict');
const { normalize } = require('./normalize.cjs');
function fixture(id, kind, tmdb, classification, en) {
  return { item: {value: 'http://www.wikidata.org/entity/' + id}, kind:{value:kind}, tmdb:{value:tmdb}, class:{value:'http://www.wikidata.org/entity/' + classification}, en:{value:en} };
}
const result = normalize([
  fixture('Q155653', 'movie', '129', 'Q20650540', 'Spirited Away'),
  fixture('Q718624', 'tv', '13916', 'Q63952888', 'Death Note'),
  fixture('Q123', 'tv', '129', 'Q63952888', 'Typed ID collision'),
  fixture('Q124', 'movie', '12', 'Q202866', 'Ordinary Animation'),
  fixture('Q125', 'tv', '13', 'Q5398426', 'Live action'),
  fixture('Q126', 'tv', '14', 'Q63952888', 'Conflicting title A'),
  fixture('Q127', 'tv', '14', 'Q63952888', 'Conflicting title B'),
  fixture('Q128', 'tv', '15', 'Q63952888', 'Conflicting ID A'),
  fixture('Q128', 'tv', '16', 'Q63952888', 'Conflicting ID A'),
], '2026-10-05');
assert.deepEqual(result.rows.map(r => r.type + '/' + r.tmdbId), ['movie/129', 'tv/13916', 'tv/129']);
assert.equal(result.rows[0].originalTitle, null);
assert.deepEqual(result.rows[0].languageEntityIds, []);
assert.deepEqual(result.rows[0].sourceDates, []);
assert.equal(result.rejected.filter(r => r.reason === 'ambiguous-tmdb-mapping').length, 1);
assert.equal(result.rejected.filter(r => r.reason === 'ambiguous-entity-mapping').length, 2);
assert.equal(result.rejected.filter(r => r.reason.startsWith('invalid')).length, 2);
console.log('Anime source normalization fixtures passed.');
