'use strict';
const assert = require('node:assert/strict');
const { compile, parseExport } = require('../scripts/compile-anime-metadata.cjs');
const gzip = require('node:zlib').gzipSync;
const valid = gzip(Buffer.from('{"id":42,"original_name":"Fixture","popularity":1}\n'));
assert.equal(parseExport(valid).size,1);
assert.throws(()=>parseExport(valid.subarray(0,valid.length-2)));
assert.throws(()=>parseExport(gzip(Buffer.from('{"id":42}\n{"id":42}\n'))));
const row = (id, type, tmdb) => ({ item: { value: 'http://www.wikidata.org/entity/' + id },
  kind: { value: type }, tmdb: { value: tmdb }, en: { value: 'Fixture ' + id },
  class: { value: 'http://www.wikidata.org/entity/' + (type === 'movie' ? 'Q20650540' : 'Q63952888') } });
const result = compile([row('Q1', 'movie', '129'), row('Q2', 'movie', '128'), row('Q3', 'movie', '127'),
  row('Q4', 'movie', '126'), row('Q5', 'tv', '129'), row('Q6', 'tv', '125')],
  new Map([['129', { adult: false, video: false, popularity: 20 }], ['128', { adult: true, video: false }],
    ['127', { adult: false, video: true }], ['126', { video: false }]]),
  new Map([['129', { adult: false, popularity: 10 }], ['125', { popularity: 10 }]]));
assert.deepEqual(result.rows.map(r => r.type + '/' + r.tmdbId), ['movie/129']);
assert.equal(result.excluded.length, 5);
assert.deepEqual(result.rows[0].languageEntityIds, []);
assert.deepEqual(result.rows[0].sourceDates, []);
assert.equal(result.rows[0].originalTitle, null);
assert.equal(result.rows[0].popularity, 20);
console.log('Anime source adult/video eligibility fixtures passed.');
const television = [row('Q7','tv','42'),row('Q8','tv','43'),row('Q9','tv','44')];
const universe = new Map([['42',{popularity:1}],['43',{adult:false,popularity:2}]]);
const adults = new Map([['43',{popularity:2}],['45',{popularity:1}]]);
assert.deepEqual(compile(television,new Map(),universe,adults,{tv:'2026-10-04',adultTv:'2026-10-04'}).rows.map(x=>x.tmdbId),['42']);
assert.equal(compile(television,new Map(),new Map([['42',{popularity:1}]]),adults,{tv:'2026-10-04',adultTv:'2026-10-03'}).rows.length,0);
assert.equal(compile(television,new Map(),new Map([['42',{popularity:1}]]),new Map(),{tv:'2026-10-04',adultTv:'2026-10-04'}).rows.length,0);
