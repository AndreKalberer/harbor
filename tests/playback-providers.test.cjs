const assert = require('node:assert/strict');
const playbackProviders = require('../shared/playback-providers.js');

assert.deepEqual(playbackProviders.providers.map((provider) => provider.id), [
  'vidlink',
  'vidsrc',
  'autoembed',
  'superembed',
  'vidfast',
  '111movies',
  'videasy',
  'vidcore',
  'cinesrc',
  'vidapi'
]);

assert.deepEqual(playbackProviders.allowedHosts, [
  'vidlink.pro',
  'vidsrc.to',
  'autoembed.to',
  'multiembed.mov',
  'streamingnow.mov',
  'vidfast.pro',
  'vidfast.vc',
  '111movies.net',
  'player.vidlove.cc',
  'player.videasy.net',
  'player.videasy.to',
  'vidcore.io',
  'cinesrc.st',
  'vaplayer.ru'
]);

assert.equal(playbackProviders.resolve('vidlink', '42', false, 1, 1), 'https://vidlink.pro/movie/42');
assert.equal(playbackProviders.resolve('vidsrc', '42', true, 3, 7), 'https://vidsrc.to/embed/tv/42/3/7');
assert.equal(playbackProviders.resolve('autoembed', '42', true, 3, 7), 'https://autoembed.to/tv/tmdb/42/3/7');
assert.equal(playbackProviders.resolve('superembed', '42', false, 1, 1), 'https://multiembed.mov/?video_id=42&tmdb=1');
assert.equal(playbackProviders.resolve('vidfast', '42', false, 1, 1), 'https://vidfast.pro/movie/42');
assert.equal(playbackProviders.resolve('111movies', '42', false, 1, 1), 'https://111movies.net/movie/42');
assert.equal(playbackProviders.resolve('videasy', '42', false, 1, 1), 'https://player.videasy.net/movie/42');
assert.equal(playbackProviders.resolve('vidcore', '42', false, 1, 1), 'https://vidcore.io/movie/42');
assert.equal(playbackProviders.resolve('cinesrc', '42', true, 3, 7), 'https://cinesrc.st/embed/tv/42?s=3&e=7');
assert.equal(playbackProviders.resolve('vidapi', '42', false, 1, 1), 'https://vaplayer.ru/embed/movie/42');
assert.equal(playbackProviders.resolve('missing', '42', false, 1, 1), 'https://vidlink.pro/movie/42');

process.stdout.write('Playback provider registry verified.\n');
