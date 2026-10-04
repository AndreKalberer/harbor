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

// Electron returns successful net.fetch responses with an empty URL.
async function verifyArtworkFetch() {
  const source = 'https://image.tmdb.org/t/p/w780/poster.jpg';
  const image = new Response('image', { headers: { 'content-type': 'image/jpeg' } });
  assert.equal(image.url, '');
  assert.equal(await artworkCache.fetchTrustedArtwork(source, async (url, options) => {
    assert.equal(url, source);
    assert.equal(options.redirect, 'manual');
    return image;
  }), image);

  const visited = [];
  assert.equal(await artworkCache.fetchTrustedArtwork(source, async (url) => {
    visited.push(url);
    return visited.length === 1
      ? new Response(null, { status: 302, headers: { location: '/t/p/w780/other.jpg' } })
      : image;
  }), image);
  assert.deepEqual(visited, [source, 'https://image.tmdb.org/t/p/w780/other.jpg']);

  for (const location of ['https://example.com/image.jpg', 'http://image.tmdb.org/image.jpg', 'file:///image.jpg']) {
    let requests = 0;
    await assert.rejects(artworkCache.fetchTrustedArtwork(source, async () => {
      requests++;
      return new Response(null, { status: 302, headers: { location } });
    }), /Untrusted artwork redirect/);
    assert.equal(requests, 1, 'Do not request an untrusted redirect destination.');
  }
  let requests = 0;
  await assert.rejects(artworkCache.fetchTrustedArtwork(source, async () => {
    requests++;
    return new Response(null, { status: 302, headers: { location: source } });
  }), /Invalid artwork redirect/);
  assert.equal(requests, 6, 'Redirect loops must be bounded.');
  await assert.rejects(artworkCache.fetchTrustedArtwork(source, async () => new Response(null, { status: 302 })), /Invalid artwork redirect/);
  await assert.rejects(artworkCache.fetchTrustedArtwork('https://example.com/image.jpg', async () => {
    throw new Error('Should never request an untrusted source.');
  }), /Invalid artwork source/);
  process.stdout.write('Artwork fetch handles empty Electron URLs and validates redirects.\n');
}
verifyArtworkFetch().catch(error => { console.error(error); process.exitCode = 1; });
