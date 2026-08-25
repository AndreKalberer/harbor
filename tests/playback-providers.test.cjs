const assert = require('node:assert/strict');
const playbackProviders = require('../shared/playback-providers.js');

assert.deepEqual(playbackProviders.providers.map((provider) => provider.id), [
  'vidlink',
  'vidsrc',
  'autoembed',
  'superembed'
]);

assert.deepEqual(playbackProviders.allowedHosts, [
  'vidlink.pro',
  'vidsrc.to',
  'autoembed.to',
  'multiembed.mov'
]);

assert.equal(playbackProviders.resolve('vidlink', '42', false, 1, 1), 'https://vidlink.pro/movie/42');
assert.equal(playbackProviders.resolve('vidsrc', '42', true, 3, 7), 'https://vidsrc.to/embed/tv/42/3/7');
assert.equal(playbackProviders.resolve('autoembed', '42', true, 3, 7), 'https://autoembed.to/tv/tmdb/42/3/7');
assert.equal(playbackProviders.resolve('superembed', '42', false, 1, 1), 'https://multiembed.mov/?video_id=42&tmdb=1');
assert.equal(playbackProviders.resolve('missing', '42', false, 1, 1), 'https://vidlink.pro/movie/42');

process.stdout.write('Playback provider registry verified.\n');
