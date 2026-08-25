const assert = require('node:assert/strict');
const artworkCache = require('../shared/artwork-cache.js');

for (const url of [
  'https://image.tmdb.org/t/p/w780/poster.jpg',
  'https://covers.openlibrary.org/b/id/42-L.jpg',
  'https://is1-ssl.mzstatic.com/image/thumb/Music/song.jpg'
]) {
  const cached = artworkCache.toCacheUrl(url);
  assert.match(cached, /^harbor-artwork:\/\/cache\//);
  assert.equal(artworkCache.fromCacheUrl(cached), url);
}

for (const url of [
  'http://image.tmdb.org/poster.jpg',
  'https://example.com/poster.jpg',
  'file:///etc/passwd',
  'not a URL'
]) {
  assert.equal(artworkCache.toCacheUrl(url), '');
}

assert.equal(artworkCache.fromCacheUrl('harbor-artwork://cache/bad-token'), '');
process.stdout.write('Artwork cache routing verified.\n');
