(function exposeLiveTv(root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarborLiveTv = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createLiveTvApi(root) {
  'use strict';

  var API_BASE = 'https://iptv-org.github.io/api/';
  var DIRECTORY_CACHE_KEY = 'harbor:live-directory:v1';
  var STREAM_HEALTH_KEY = 'harbor:live-stream-health:v1';
  var DIRECTORY_CACHE_LIMIT = 6;
  var DIRECTORY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  var STREAM_FAILURE_TTL_MS = 24 * 60 * 60 * 1000;
  var STREAM_FAILURE_THRESHOLD = 2;
  var metadataPromise = null;
  var guideIndexPromise = null;
  var guideDocumentCache = {};
  var tizenAllowedHosts = [
    'liveeu-gcp.alkassdigital.net', 'a-cdn.klowdtv.com', 'streams2.sofast.tv',
    'stream-us-east-1.getpublica.com', 'linear-253.frequency.stream', 'd36r8jifhgsk5j.cloudfront.net',
    'mainstreammedia-worldoffreesportsintl-rakuten.amagi.tv', '30a-tv.com',
    'raycom-accdn-firetv.amagi.tv', 'webstream.multistream.it',
    'africa24.vedge.infomaniak.com', 'kanal75xto-llhls.akamaized.net',
    'mgv-awapa.akamaized.net', 'bein-xtra-bein.amagi.tv', 'cdn3.wowza.com',
    'pb-wm04vonaerv0k.akamaized.net', 'dfr80qz435crc.cloudfront.net',
    'proped3fhg87.airspace-cdn.cbsivideo.com', 'propee33f9c2.airspace-cdn.cbsivideo.com',
    'na.linear.zype.com', 'd3b6q2ou5kp8ke.cloudfront.net', 'd3d85c7qkywguj.cloudfront.net',
    'aegis-cloudfront-1.tubi.video', 'lotus.stingray.com', 'shd-gcp-live.edgenextcdn.net',
    'd3qs3d2rkhfqrt.cloudfront.net', 'n18syndication.akamaized.net',
    'cbcrclinear-tor.akamaized.net', 'cdn-uw2-prod.tsv2.amagi.tv'
  ];

  var sportTaxonomy = [
    { id: 'american-football', label: 'American Football', terms: ['nfl', 'gridiron', 'american football'] },
    { id: 'basketball', label: 'Basketball', terms: ['basketball', 'nba', 'wnba'] },
    { id: 'baseball', label: 'Baseball', terms: ['baseball', 'mlb'] },
    { id: 'hockey', label: 'Hockey', terms: ['hockey', 'nhl'] },
    { id: 'soccer', label: 'Soccer', terms: ['soccer', 'football', 'futbol', 'fútbol', 'premier league', 'uefa', 'fifa', 'la liga'] },
    { id: 'combat', label: 'Combat Sports', terms: ['boxing', 'mma', 'ufc', 'wrestling', 'fight'] },
    { id: 'motorsports', label: 'Motorsports', terms: ['motor', 'racing', 'formula', 'nascar', 'auto sport', 'motogp'] },
    { id: 'tennis', label: 'Tennis', terms: ['tennis', 'atp', 'wta'] },
    { id: 'golf', label: 'Golf', terms: ['golf', 'pga'] },
    { id: 'cricket', label: 'Cricket', terms: ['cricket', 'ipl'] },
    { id: 'rugby', label: 'Rugby', terms: ['rugby'] }
  ];

  function normalize(value) {
    return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function safeHttpsUrl(value) {
    try {
      var url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function supportedStreamType(value) {
    var url = safeHttpsUrl(value);
    if (!url) return '';
    if (/\.m3u8(?:$|[?#])/i.test(url)) return 'hls';
    if (/\.(?:mp4|m4v|webm)(?:$|[?#])/i.test(url)) return 'video';
    return '';
  }

  function readAttributes(line) {
    var attributes = {};
    var pattern = /([\w-]+)="([^"]*)"/g;
    var match;
    while ((match = pattern.exec(line))) attributes[match[1]] = match[2];
    return attributes;
  }

  function splitChannelKey(value) {
    var parts = String(value || '').split('@');
    return { channelId: parts[0] || '', feedId: parts.slice(1).join('@') || '' };
  }

  function countryCodeFromChannelId(channelId) {
    var match = String(channelId || '').match(/\.([a-z]{2})$/i);
    return match ? match[1].toUpperCase() : '';
  }

  function cleanChannelName(value) {
    return String(value || 'Live channel')
      .replace(/\s+\((?:\d{3,4}p|\d{3,4}i|4K|UHD|FHD|HD|SD)\)\s*/gi, ' ')
      .replace(/\s+\[[^\]]+\]\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Live channel';
  }

  function streamQuality(value) {
    var match = String(value || '').match(/\((\d{3,4})[pi]\)/i);
    if (match) return match[1] + 'p';
    if (/\(4K\)|\(UHD\)/i.test(value)) return '2160p';
    if (/\(FHD\)/i.test(value)) return '1080p';
    if (/\(HD\)/i.test(value)) return '720p';
    if (/\(SD\)/i.test(value)) return '480p';
    return '';
  }

  function streamLabel(value) {
    var match = String(value || '').match(/\[([^\]]+)\]\s*$/);
    return match ? match[1].trim() : '';
  }

  function isUnsafeName(value) {
    var text = normalize(value);
    return /(?:^| )(?:adult|xxx|porn|playboy|erotic)(?: |$)/.test(text);
  }

  function parseM3u(text, options) {
    var settings = options || {};
    var lines = String(text || '').replace(/\r/g, '').split('\n');
    var entries = [];
    var pending = null;
    var requiresHeaders = false;
    var seen = {};

    lines.forEach(function (rawLine) {
      var line = rawLine.trim();
      if (!line) return;
      if (line.indexOf('#EXTINF:') === 0) {
        var attributes = readAttributes(line);
        var comma = line.indexOf(',');
        var rawName = comma >= 0 ? line.slice(comma + 1).trim() : (attributes['tvg-name'] || 'Live channel');
        var key = splitChannelKey(attributes['tvg-id']);
        pending = {
          id: attributes['tvg-id'] || '',
          channelId: key.channelId,
          feedId: key.feedId,
          name: cleanChannelName(rawName),
          rawName: rawName,
          logo: safeHttpsUrl(attributes['tvg-logo']),
          group: attributes['group-title'] || settings.category || 'Live TV',
          groups: String(attributes['group-title'] || settings.category || 'Live TV').split(';').map(function (value) { return value.trim(); }).filter(Boolean),
          countryCode: countryCodeFromChannelId(key.channelId),
          quality: streamQuality(rawName),
          label: streamLabel(rawName)
        };
        requiresHeaders = Boolean(attributes['http-referrer'] || attributes['http-user-agent']);
        return;
      }
      if (line.indexOf('#EXTVLCOPT:http-referrer=') === 0 || line.indexOf('#EXTVLCOPT:http-user-agent=') === 0 || line.indexOf('#EXTHTTP:') === 0) {
        requiresHeaders = true;
        return;
      }
      if (line.charAt(0) === '#' || !pending) return;
      var type = supportedStreamType(line);
      var acceptable = Boolean(type)
        && !requiresHeaders
        && !isUnsafeName(pending.name + ' ' + pending.group)
        && !seen[line];
      if (acceptable) {
        seen[line] = true;
        entries.push(Object.assign({}, pending, { url: safeHttpsUrl(line), streamType: type }));
      }
      pending = null;
      requiresHeaders = false;
    });

    return entries;
  }

  function request(url, responseType, maxCharacters) {
    var limit = Number(maxCharacters) || 12 * 1024 * 1024;
    if (typeof fetch === 'function') {
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
      return fetch(url, controller ? { signal: controller.signal, cache: 'no-store' } : { cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error('Live data request failed');
        return response.text();
      }).then(function (text) {
        if (timer) clearTimeout(timer);
        if (text.length > limit) throw new Error('Live data response was too large');
        return responseType === 'json' ? JSON.parse(text) : text;
      }, function (error) {
        if (timer) clearTimeout(timer);
        throw error;
      });
    }
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 15000;
      xhr.onload = function () {
        if (xhr.status < 200 || xhr.status >= 300) { reject(new Error('Live data request failed')); return; }
        if (xhr.responseText.length > limit) { reject(new Error('Live data response was too large')); return; }
        try { resolve(responseType === 'json' ? JSON.parse(xhr.responseText) : xhr.responseText); }
        catch (error) { reject(error); }
      };
      xhr.onerror = function () { reject(new Error('Live data request failed')); };
      xhr.ontimeout = function () { reject(new Error('Live data request timed out')); };
      xhr.send();
    });
  }

  function loadMetadata() {
    if (metadataPromise) return metadataPromise;
    metadataPromise = Promise.all([
      request(API_BASE + 'feeds.json', 'json', 12 * 1024 * 1024),
      request(API_BASE + 'countries.json', 'json', 512 * 1024),
      request(API_BASE + 'languages.json', 'json', 1024 * 1024),
      request(API_BASE + 'blocklist.json', 'json', 512 * 1024)
    ]).then(function (groups) {
      var feeds = {};
      var mainFeeds = {};
      var countries = {};
      var languages = {};
      var blocked = {};
      groups[0].forEach(function (feed) {
        if (!feed || !feed.channel) return;
        feeds[feed.channel + '@' + String(feed.id || '')] = feed;
        if (feed.is_main && !mainFeeds[feed.channel]) mainFeeds[feed.channel] = feed;
      });
      groups[1].forEach(function (country) { if (country && country.code) countries[country.code] = country; });
      groups[2].forEach(function (language) { if (language && language.code && !languages[language.code]) languages[language.code] = language; });
      groups[3].forEach(function (entry) { if (entry && entry.channel) blocked[entry.channel] = entry.reason || 'blocked'; });
      return { feeds: feeds, mainFeeds: mainFeeds, countries: countries, languages: languages, blocked: blocked };
    }).catch(function (error) {
      metadataPromise = null;
      throw error;
    });
    return metadataPromise;
  }

  function classifySports(name) {
    var text = normalize(name);
    return sportTaxonomy.filter(function (sport) {
      return sport.terms.some(function (term) { return text.indexOf(normalize(term)) >= 0; });
    }).map(function (sport) { return sport.id; });
  }

  function qualityScore(value) {
    var match = String(value || '').match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function groupChannels(entries, metadata) {
    var groups = {};
    entries.forEach(function (entry) {
      if (!entry.channelId || metadata.blocked[entry.channelId]) return;
      var key = entry.channelId + '@' + entry.feedId;
      var feed = metadata.feeds[key] || metadata.mainFeeds[entry.channelId] || null;
      var countryCode = entry.countryCode || '';
      var country = metadata.countries[countryCode] || null;
      var languageCodes = feed && Array.isArray(feed.languages) ? feed.languages.filter(Boolean) : [];
      var languageNames = languageCodes.map(function (code) { return metadata.languages[code] && metadata.languages[code].name || code.toUpperCase(); });
      if (!groups[key]) {
        groups[key] = {
          id: key,
          channelId: entry.channelId,
          feedId: entry.feedId,
          name: entry.name,
          logo: entry.logo,
          group: entry.group,
          groups: entry.groups,
          categories: entry.groups.map(function (group) { return normalize(group).replace(/ /g, '-'); }),
          countryCode: countryCode,
          countryName: country ? country.name : countryCode,
          countryFlag: country ? country.flag : '',
          languageCodes: languageCodes,
          languageNames: languageNames,
          sports: classifySports(entry.name + ' ' + entry.group),
          streams: []
        };
      }
      if (!groups[key].logo && entry.logo) groups[key].logo = entry.logo;
      if (!groups[key].streams.some(function (stream) { return stream.url === entry.url; })) {
        groups[key].streams.push({ url: entry.url, type: entry.streamType, quality: entry.quality, label: entry.label });
      }
    });

    return Object.keys(groups).map(function (key) {
      var channel = groups[key];
      channel.streams.sort(function (left, right) {
        return Number(Boolean(left.label)) - Number(Boolean(right.label)) || qualityScore(right.quality) - qualityScore(left.quality);
      });
      channel.streams = channel.streams.slice(0, 4);
      channel.url = channel.streams[0] ? channel.streams[0].url : '';
      return channel;
    });
  }

  function storageOrDefault(candidate) {
    if (candidate) return candidate;
    try { return root && root.localStorage ? root.localStorage : null; } catch (_) { return null; }
  }

  function readJsonStorage(storage, key, fallback) {
    try { return JSON.parse(storage.getItem(key) || '') || fallback; } catch (_) { return fallback; }
  }

  function writeJsonStorage(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
  }

  function pruneHealth(value, now) {
    var health = value && typeof value === 'object' ? value : {};
    var entries = Object.keys(health).map(function (url) { return { url: url, value: health[url] }; })
      .filter(function (entry) { return entry.value && now - Number(entry.value.lastFailedAt || 0) < STREAM_FAILURE_TTL_MS; })
      .sort(function (left, right) { return Number(right.value.lastFailedAt || 0) - Number(left.value.lastFailedAt || 0); })
      .slice(0, 120);
    return entries.reduce(function (result, entry) { result[entry.url] = entry.value; return result; }, {});
  }

  function streamHealth(storage, now) {
    var target = storageOrDefault(storage);
    if (!target) return {};
    return pruneHealth(readJsonStorage(target, STREAM_HEALTH_KEY, {}), Number(now) || Date.now());
  }

  function markStreamFailure(url, storage, now) {
    var target = storageOrDefault(storage);
    var safeUrl = safeHttpsUrl(url);
    if (!target || !safeUrl) return;
    var timestamp = Number(now) || Date.now();
    var health = streamHealth(target, timestamp);
    var previous = health[safeUrl] || { failures: 0, lastFailedAt: 0 };
    health[safeUrl] = { failures: Math.min(10, Number(previous.failures || 0) + 1), lastFailedAt: timestamp };
    writeJsonStorage(target, STREAM_HEALTH_KEY, health);
  }

  function markStreamSuccess(url, storage) {
    var target = storageOrDefault(storage);
    var safeUrl = safeHttpsUrl(url);
    if (!target || !safeUrl) return;
    var health = readJsonStorage(target, STREAM_HEALTH_KEY, {});
    if (health && health[safeUrl]) {
      delete health[safeUrl];
      writeJsonStorage(target, STREAM_HEALTH_KEY, health);
    }
  }

  function isQuarantined(url, health) {
    var entry = health && health[safeHttpsUrl(url)];
    return Boolean(entry && Number(entry.failures || 0) >= STREAM_FAILURE_THRESHOLD);
  }

  function streamHostAllowed(url, platform) {
    if (platform !== 'tizen') return true;
    try { return tizenAllowedHosts.indexOf(new URL(url).hostname) >= 0; } catch (_) { return false; }
  }

  function channelMatchesQuery(channel, query) {
    var needle = normalize(query);
    if (!needle) return true;
    var text = normalize([
      channel.name,
      channel.countryName,
      channel.countryCode,
      channel.languageNames.join(' '),
      channel.languageCodes.join(' '),
      channel.groups.join(' '),
      channel.sports.join(' ')
    ].join(' '));
    return needle.split(' ').every(function (token) { return text.indexOf(token) >= 0; });
  }

  function filterChannels(channels, options) {
    var settings = options || {};
    var health = streamHealth(settings.storage, settings.now);
    var filtered = channels.map(function (channel) {
      var streams = channel.streams.filter(function (stream) {
        return !isQuarantined(stream.url, health) && streamHostAllowed(stream.url, settings.platform);
      });
      return Object.assign({}, channel, { streams: streams, url: streams[0] ? streams[0].url : '' });
    }).filter(function (channel) {
      if (!channel.streams.length) return false;
      if (settings.country && channel.countryCode !== settings.country) return false;
      if (settings.language && channel.languageCodes.indexOf(settings.language) < 0) return false;
      if (settings.sport && channel.sports.indexOf(settings.sport) < 0) return false;
      if (Array.isArray(settings.terms) && settings.terms.length) {
        var name = normalize(channel.name + ' ' + channel.groups.join(' '));
        if (!settings.terms.some(function (term) { return name.indexOf(normalize(term)) >= 0; })) return false;
      }
      return channelMatchesQuery(channel, settings.query);
    });
    filtered.sort(function (left, right) {
      return Number(Boolean(right.logo)) - Number(Boolean(left.logo))
        || String(left.countryName || '').localeCompare(String(right.countryName || ''))
        || left.name.localeCompare(right.name);
    });
    return filtered;
  }

  function facetsFor(channels) {
    var countries = {};
    var languages = {};
    channels.forEach(function (channel) {
      if (channel.countryCode) countries[channel.countryCode] = { code: channel.countryCode, name: channel.countryName || channel.countryCode, flag: channel.countryFlag || '' };
      channel.languageCodes.forEach(function (code, index) { languages[code] = { code: code, name: channel.languageNames[index] || code.toUpperCase() }; });
    });
    return {
      countries: Object.keys(countries).map(function (key) { return countries[key]; }).sort(function (a, b) { return a.name.localeCompare(b.name); }),
      languages: Object.keys(languages).map(function (key) { return languages[key]; }).sort(function (a, b) { return a.name.localeCompare(b.name); }),
      sports: sportTaxonomy.map(function (sport) { return { id: sport.id, name: sport.label }; })
    };
  }

  function directoryCacheKey(settings) {
    return [settings.playlistCategory, settings.sport || '', settings.country || '', settings.language || '', normalize(settings.query || '')].join('|');
  }

  function readDirectorySnapshot(settings) {
    var storage = storageOrDefault(settings.storage);
    if (!storage) return null;
    var cache = readJsonStorage(storage, DIRECTORY_CACHE_KEY, { entries: [] });
    var key = directoryCacheKey(settings);
    var entry = (cache.entries || []).filter(function (candidate) { return candidate.key === key; })[0];
    if (!entry || Date.now() - Number(entry.savedAt || 0) > DIRECTORY_CACHE_TTL_MS) return null;
    return entry.directory || null;
  }

  function writeDirectorySnapshot(settings, directory) {
    var storage = storageOrDefault(settings.storage);
    if (!storage) return;
    var key = directoryCacheKey(settings);
    var cache = readJsonStorage(storage, DIRECTORY_CACHE_KEY, { entries: [] });
    var compact = {
      channels: directory.channels.slice(0, 160).map(function (channel) {
        return Object.assign({}, channel, { streams: channel.streams.slice(0, 3) });
      }),
      facets: directory.facets,
      total: directory.total,
      cached: true
    };
    cache.entries = [{ key: key, savedAt: Date.now(), directory: compact }].concat((cache.entries || []).filter(function (entry) { return entry.key !== key; })).slice(0, DIRECTORY_CACHE_LIMIT);
    writeJsonStorage(storage, DIRECTORY_CACHE_KEY, cache);
  }

  function loadDirectory(playlistUrl, options) {
    var settings = Object.assign({ limit: 160, playlistCategory: 'general' }, options || {});
    var url = safeHttpsUrl(playlistUrl);
    if (!url || url.indexOf('https://iptv-org.github.io/iptv/') !== 0) return Promise.reject(new Error('Unsupported live playlist'));
    return Promise.all([
      request(url, 'text', 8 * 1024 * 1024),
      loadMetadata()
    ]).then(function (groups) {
      var parsed = parseM3u(groups[0], { category: settings.playlistCategory });
      var grouped = groupChannels(parsed, groups[1]);
      var facets = facetsFor(grouped);
      var filtered = filterChannels(grouped, settings);
      var directory = { channels: filtered.slice(0, Number(settings.limit) || 160), facets: facets, total: filtered.length, cached: false };
      writeDirectorySnapshot(settings, directory);
      return directory;
    }).catch(function (error) {
      var snapshot = readDirectorySnapshot(settings);
      if (snapshot) return snapshot;
      throw error;
    });
  }

  function decodeXml(value) {
    return String(value || '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, '').trim();
  }

  function parseXmlTvDate(value) {
    var match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-])(\d{2})(\d{2})/);
    if (!match) return null;
    var utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]));
    var offset = (Number(match[8]) * 60 + Number(match[9])) * 60000 * (match[7] === '+' ? 1 : -1);
    return new Date(utc - offset);
  }

  function parseXmlTv(text, channelKey, now, limit, horizonDays) {
    var programmes = [];
    var pattern = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/gi;
    var match;
    var timestamp = now instanceof Date ? now.getTime() : Number(now) || Date.now();
    var days = Math.max(1, Math.min(7, Number(horizonDays) || 1));
    var horizon = timestamp + days * 24 * 60 * 60 * 1000;
    while ((match = pattern.exec(String(text || '')))) {
      var attributes = readAttributes('<programme ' + match[1] + '>');
      if (channelKey && attributes.channel !== channelKey) continue;
      var start = parseXmlTvDate(attributes.start);
      var stop = parseXmlTvDate(attributes.stop);
      if (!start || !stop || stop.getTime() < timestamp - 5 * 60 * 1000 || start.getTime() > horizon) continue;
      var titleMatch = match[2].match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
      var descriptionMatch = match[2].match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/i);
      programmes.push({
        title: decodeXml(titleMatch && titleMatch[1]) || 'Scheduled programme',
        description: decodeXml(descriptionMatch && descriptionMatch[1]),
        start: start.toISOString(),
        stop: stop.toISOString(),
        current: start.getTime() <= timestamp && stop.getTime() > timestamp
      });
    }
    programmes.sort(function (left, right) { return new Date(left.start) - new Date(right.start); });
    return programmes.slice(0, Number(limit) || 5);
  }

  function groupGuideProgrammes(programmes, now) {
    var timestamp = now instanceof Date ? now.getTime() : Number(now) || Date.now();
    var nextDay = new Date(timestamp);
    nextDay.setHours(24, 0, 0, 0);
    var nextDayTimestamp = nextDay.getTime();
    return (Array.isArray(programmes) ? programmes : []).reduce(function (groups, programme) {
      var start = new Date(programme && programme.start).getTime();
      var stop = new Date(programme && programme.stop).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= timestamp) return groups;
      if ((start <= timestamp && stop > timestamp) || programme.current) groups.liveNow.push(programme);
      else if (start < nextDayTimestamp) groups.laterToday.push(programme);
      else groups.laterThisWeek.push(programme);
      return groups;
    }, { liveNow: [], laterToday: [], laterThisWeek: [] });
  }

  function loadGuideIndex() {
    if (guideIndexPromise) return guideIndexPromise;
    guideIndexPromise = request(API_BASE + 'guides.json', 'json', 32 * 1024 * 1024).then(function (guides) {
      return guides.filter(function (guide) {
        return guide && guide.channel && Array.isArray(guide.sources) && guide.sources.some(function (source) {
          return source && source.format === 'XML' && safeHttpsUrl(source.url);
        });
      }).reduce(function (index, guide) {
        var key = guide.channel + '@' + String(guide.feed || '');
        var source = guide.sources.filter(function (candidate) { return candidate.format === 'XML' && safeHttpsUrl(candidate.url); })[0];
        index[key] = {
          channelId: guide.channel,
          feedId: guide.feed || '',
          site: guide.site || '',
          siteName: guide.site_name || '',
          language: guide.lang || '',
          sourceUrl: safeHttpsUrl(source.url)
        };
        return index;
      }, {});
    }).catch(function (error) {
      guideIndexPromise = null;
      throw error;
    });
    return guideIndexPromise;
  }

  function loadGuide(channelId, feedId, options) {
    var settings = options || {};
    var key = String(channelId || '') + '@' + String(feedId || '');
    if (!channelId) return Promise.resolve({ status: 'unavailable', programmes: [] });
    return loadGuideIndex().then(function (index) {
      var guide = index[key] || index[String(channelId) + '@'];
      if (!guide) return { status: 'unavailable', programmes: [] };
      var requestPromise = guideDocumentCache[guide.sourceUrl];
      if (!requestPromise) {
        requestPromise = request(guide.sourceUrl, 'text', 5 * 1024 * 1024).catch(function (error) {
          delete guideDocumentCache[guide.sourceUrl];
          throw error;
        });
        guideDocumentCache[guide.sourceUrl] = requestPromise;
      }
      return requestPromise.then(function (text) {
        var programmes = parseXmlTv(text, key, settings.now, settings.limit || 60, settings.horizonDays || 7);
        return {
          status: programmes.length ? 'available' : 'empty',
          provider: guide.siteName || guide.site,
          language: guide.language,
          programmes: programmes
        };
      });
    }).catch(function () { return { status: 'unavailable', programmes: [] }; });
  }

  return Object.freeze({
    API_BASE: API_BASE,
    DIRECTORY_CACHE_KEY: DIRECTORY_CACHE_KEY,
    STREAM_HEALTH_KEY: STREAM_HEALTH_KEY,
    sportTaxonomy: sportTaxonomy.map(function (sport) { return Object.assign({}, sport, { terms: sport.terms.slice() }); }),
    tizenAllowedHosts: tizenAllowedHosts.slice(),
    normalize: normalize,
    safeHttpsUrl: safeHttpsUrl,
    supportedStreamType: supportedStreamType,
    parseM3u: parseM3u,
    groupChannels: groupChannels,
    classifySports: classifySports,
    filterChannels: filterChannels,
    facetsFor: facetsFor,
    loadDirectory: loadDirectory,
    streamHealth: streamHealth,
    markStreamFailure: markStreamFailure,
    markStreamSuccess: markStreamSuccess,
    isQuarantined: isQuarantined,
    parseXmlTvDate: parseXmlTvDate,
    parseXmlTv: parseXmlTv,
    groupGuideProgrammes: groupGuideProgrammes,
    loadGuide: loadGuide
  });
}));
