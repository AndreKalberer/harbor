const assert = require('node:assert/strict');
const watchBrowse = require('../shared/watch-browse');

for (const section of ['Movies', 'TV Shows', 'Anime', 'Sports', 'Live TV']) {
  assert.ok(watchBrowse.getFilters(section).length >= 8, section + ' should expose a useful set of filters');
  assert.equal(watchBrowse.defaultFilterId(section), watchBrowse.getFilters(section)[0].id);
}

const nowPlaying = watchBrowse.buildTmdbRequest('Movies', 'now-playing', 3, '2026-08-24');
assert.equal(nowPlaying.endpoint, 'movie/now_playing');
assert.equal(nowPlaying.mediaType, 'movie');
assert.equal(nowPlaying.params.page, '3');

const animeToday = watchBrowse.buildTmdbRequest('Anime', 'airing-today', 1, '2026-08-24');
assert.equal(animeToday.endpoint, 'discover/tv');
assert.equal(animeToday.params['air_date.gte'], '2026-08-24');
assert.equal(animeToday.params['air_date.lte'], '2026-08-24');

assert.equal(watchBrowse.matchesLocalFilter({ name: 'NBA TV', sections: ['Sports'] }, 'Sports', 'basketball'), true);
assert.equal(watchBrowse.matchesLocalFilter({ name: 'NHL Network', sections: ['Sports'] }, 'Sports', 'basketball'), false);
assert.equal(watchBrowse.matchesLocalFilter({ rating: 8.6, sections: ['Movie'] }, 'Movies', 'top-rated'), true);
assert.equal(watchBrowse.matchesLocalFilter({ rating: 7.9, sections: ['Movie'] }, 'Movies', 'top-rated'), false);

const playlist = `#EXTM3U
#EXTINF:-1 tvg-id="NewsOne.us" tvg-logo="https://img.example/news.png" group-title="News",News One
https://media.example/news/index.m3u8
#EXTINF:-1 tvg-id="Duplicate.us" group-title="News",Duplicate
https://media.example/news/index.m3u8
#EXTINF:-1 tvg-id="NeedsHeaders.us" group-title="Sports",Header-only Sports
#EXTVLCOPT:http-referrer=https://example.com/
https://media.example/protected/index.m3u8
#EXTINF:-1 tvg-id="Old.us" group-title="News",Old HTTP
http://media.example/old/index.m3u8
#EXTINF:-1 tvg-id="Adult.us" group-title="XXX",Adult
https://media.example/adult/index.m3u8
#EXTINF:-1 tvg-id="Sports.us" group-title="Sports",NBA Channel
https://media.example/nba/index.m3u8`;

const parsed = watchBrowse.parseM3u(playlist);
assert.deepEqual(parsed.map((entry) => entry.name), ['News One', 'NBA Channel']);
assert.equal(parsed[0].logo, 'https://img.example/news.png');

process.stdout.write(JSON.stringify({
  filters: Object.fromEntries(['Movies', 'TV Shows', 'Anime', 'Sports', 'Live TV'].map((section) => [section, watchBrowse.getFilters(section).length])),
  parsedChannels: parsed.length
}) + '\n');
