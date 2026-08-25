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

assert.equal(watchBrowse.getFilter('Sports', 'featured-free').source, 'free-events');
assert.equal(typeof watchBrowse.loadLiveWindowDirectory, 'function');
const scheduled = watchBrowse.formatScheduledChannel({ id: 'sports.us', name: 'Sports Network', groups: ['Sports'], streams: [{ url: 'https://media.example/live.m3u8' }] }, { title: 'Evening Match', description: 'League play.', start: '2026-08-26T01:00:00.000Z', stop: '2026-08-26T03:00:00.000Z' }, 'Later this week');
assert.equal(scheduled.name, 'Evening Match');
assert.equal(scheduled.eventStatus, 'Upcoming');
assert.equal(scheduled.channelName, 'Sports Network');
assert(scheduled.groups.includes('Live Soon'));
assert.equal(watchBrowse.getFilter('Sports', 'robot-games').collection, 'robot-games');
for (const category of ['series', 'animation', 'science', 'education', 'comedy', 'travel', 'public']) {
  assert.equal(watchBrowse.getFilter('Live TV', category).playlistCategory, category);
}
assert.equal(watchBrowse.safeEventStreamUrl('https://live-stream.cgtn.com/event-live/CGTN_1_test/index.m3u8'), 'https://live-stream.cgtn.com/event-live/CGTN_1_test/index.m3u8');
assert.equal(watchBrowse.safeEventStreamUrl('https://envod.cgtn.com/event-live/CGTN_1_test/vod.m3u8?version=1'), 'https://envod.cgtn.com/event-live/CGTN_1_test/vod.m3u8?version=1');
assert.equal(watchBrowse.safeEventStreamUrl('https://evil.example/event-live/index.m3u8'), '');

const freeEvent = watchBrowse.normalizeFreeEvent({
  id: 'RobotTest123', title: 'World Humanoid Robot Games — Test Session', collections: ['featured', 'robot-games'], order: 10
}, {
  status: 200,
  data: {
    summary: 'Official test coverage.',
    live: { status: 2, startTimeStr: '1787637604515' },
    cover: { r_16_9: { quality_min: { url: 'https://news.cgtn.com/robot-games.png' } } },
    coverVideos: [
      { video: { url: 'https://live-stream.cgtn.com/event-live/CGTN_1_RobotTest123/index.m3u8' } },
      { video: { url: 'https://live-stream.cgtn.com/event-live/CGTN_1_RobotTest123/index.m3u8' } },
      { video: { url: 'https://evil.example/unauthorized.m3u8' } }
    ],
    shareBody: { shareUrl: 'https://news.cgtn.com/robot-games.html' }
  }
});
assert.equal(freeEvent.id, 'cgtn-RobotTest123');
assert.equal(freeEvent.eventStatus, 'Live');
assert.equal(freeEvent.streams.length, 1);
assert.deepEqual(freeEvent.sports, ['robotics']);
assert.equal(watchBrowse.filterFreeEvents([freeEvent], 'robot-games', { query: 'humanoid test' }).length, 1);
assert.equal(watchBrowse.filterFreeEvents([freeEvent], 'technology', {}).length, 0);

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
  parsedChannels: parsed.length,
  freeEvent: freeEvent.name
}) + '\n');
