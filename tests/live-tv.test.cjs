const assert = require('node:assert/strict');
const liveTv = require('../shared/live-tv');

const playlist = `#EXTM3U
#EXTINF:-1 tvg-id="ACCDigitalNetwork.us@SD" tvg-logo="https://img.example/acc.png" group-title="Sports",ACC Digital Network (1080p)
https://raycom-accdn-firetv.amagi.tv/playlist.m3u8
#EXTINF:-1 tvg-id="ACCDigitalNetwork.us@SD" group-title="Sports",ACCDN (720p) [Geo-blocked]
https://aegis-cloudfront-1.tubi.video/acc/playlist.m3u8
#EXTINF:-1 tvg-id="Blocked.us@SD" group-title="Sports",Blocked Sports
https://media.example/blocked.m3u8
#EXTINF:-1 tvg-id="Headers.us@SD" group-title="Sports",Header Sports
#EXTVLCOPT:http-referrer=https://example.com/
https://media.example/header.m3u8
#EXTINF:-1 tvg-id="Http.us@SD" group-title="Sports",Old Sports
http://media.example/old.m3u8
#EXTINF:-1 tvg-id="Adult.us@SD" group-title="XXX;Sports",Adult Sports
https://media.example/adult.m3u8
#EXTINF:-1 tvg-id="Dash.us@SD" group-title="Sports",Unsupported Dash
https://media.example/manifest.mpd`;

const parsed = liveTv.parseM3u(playlist, { category: 'sports' });
assert.equal(parsed.length, 3);
assert.equal(parsed[0].channelId, 'ACCDigitalNetwork.us');
assert.equal(parsed[0].feedId, 'SD');
assert.equal(parsed[0].countryCode, 'US');
assert.equal(parsed[0].quality, '1080p');
assert.deepEqual(parsed[0].groups, ['Sports']);

const metadata = {
  feeds: {
    'ACCDigitalNetwork.us@SD': { channel: 'ACCDigitalNetwork.us', id: 'SD', is_main: true, languages: ['eng'] },
    'Blocked.us@SD': { channel: 'Blocked.us', id: 'SD', is_main: true, languages: ['eng'] }
  },
  mainFeeds: {},
  countries: { US: { code: 'US', name: 'United States', flag: '🇺🇸' } },
  languages: { eng: { code: 'eng', name: 'English' } },
  blocked: { 'Blocked.us': 'dmca' }
};

const channels = liveTv.groupChannels(parsed, metadata);
assert.equal(channels.length, 1);
assert.equal(channels[0].streams.length, 2);
assert.equal(channels[0].countryName, 'United States');
assert.deepEqual(channels[0].languageNames, ['English']);
assert.deepEqual(channels[0].sports, []);

const basketballChannel = {
  ...channels[0],
  name: 'NBA Basketball Network',
  sports: liveTv.classifySports('NBA Basketball Network')
};
assert.deepEqual(basketballChannel.sports, ['basketball']);
assert.equal(liveTv.filterChannels([basketballChannel], { country: 'US', language: 'eng', sport: 'basketball', query: 'united english' }).length, 1);
assert.equal(liveTv.filterChannels([basketballChannel], { language: 'spa' }).length, 0);
assert.equal(liveTv.filterChannels([basketballChannel], { platform: 'tizen' }).length, 1);

const memory = new Map();
const storage = {
  getItem: (key) => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, value)
};
liveTv.markStreamFailure(channels[0].streams[0].url, storage, 1000);
assert.equal(liveTv.isQuarantined(channels[0].streams[0].url, liveTv.streamHealth(storage, 1001)), false);
liveTv.markStreamFailure(channels[0].streams[0].url, storage, 2000);
assert.equal(liveTv.isQuarantined(channels[0].streams[0].url, liveTv.streamHealth(storage, 2001)), true);
assert.equal(liveTv.filterChannels([basketballChannel], { storage, now: 2001 })[0].streams.length, 1);
liveTv.markStreamSuccess(channels[0].streams[0].url, storage);
assert.equal(liveTv.isQuarantined(channels[0].streams[0].url, liveTv.streamHealth(storage, 2002)), false);

const xml = `<?xml version="1.0"?><tv>
<programme start="20260824120000 +0000" stop="20260824130000 +0000" channel="ACCDigitalNetwork.us@SD"><title>Live Match &amp; Analysis</title><desc>First game.</desc></programme>
<programme start="20260824130000 +0000" stop="20260824140000 +0000" channel="ACCDigitalNetwork.us@SD"><title>Next Match</title></programme>
<programme start="20260826130000 +0000" stop="20260826140000 +0000" channel="ACCDigitalNetwork.us@SD"><title>Midweek Match</title></programme>
<programme start="20260902130000 +0000" stop="20260902140000 +0000" channel="ACCDigitalNetwork.us@SD"><title>Outside Guide Window</title></programme>
<programme start="20260824120000 +0000" stop="20260824130000 +0000" channel="Other.us@SD"><title>Wrong channel</title></programme>
</tv>`;
const guideNow = new Date('2026-08-24T12:30:00Z');
const guide = liveTv.parseXmlTv(xml, 'ACCDigitalNetwork.us@SD', guideNow, 10, 7);
assert.equal(guide.length, 3);
assert.equal(guide[0].current, true);
assert.equal(guide[0].title, 'Live Match & Analysis');
assert.equal(guide[1].current, false);
const guideGroups = liveTv.groupGuideProgrammes(guide, guideNow);
assert.deepEqual(guideGroups.liveNow.map((entry) => entry.title), ['Live Match & Analysis']);
assert.deepEqual(guideGroups.laterToday.map((entry) => entry.title), ['Next Match']);
assert.deepEqual(guideGroups.laterThisWeek.map((entry) => entry.title), ['Midweek Match']);
assert.equal(liveTv.parseXmlTvDate('20260824120000 +0200').toISOString(), '2026-08-24T10:00:00.000Z');

process.stdout.write(JSON.stringify({ parsedStreams: parsed.length, groupedChannels: channels.length, guidePrograms: guide.length, guideGroups: Object.fromEntries(Object.entries(guideGroups).map(([key, entries]) => [key, entries.length])) }) + '\n');
