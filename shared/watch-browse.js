(function (root, factory) {
  var liveTvApi = typeof module === 'object' && module.exports ? require('./live-tv.js') : root && root.HarborLiveTv;
  var api = factory(liveTvApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarborWatchBrowse = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (liveTvApi) {
  'use strict';

  var IPTV_BASE = 'https://iptv-org.github.io/iptv/categories/';
  var FREE_EVENT_API_BASE = 'https://api.cgtn.com/app/api/news/info?id=';
  var FREE_EVENT_CACHE_KEY = 'harbor:free-events:v1';
  var FREE_EVENT_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  var FREE_EVENT_REFRESH_MS = 5 * 60 * 1000;
  var freeEventMemory = { savedAt: 0, events: [] };
  var freeEventDefinitions = [
    { id: '1PTl28sWxDq', title: 'World Humanoid Robot Games — Episode 4', collections: ['featured', 'robot-games'], order: 90 },
    { id: '1PRF61K79U4', title: 'World Humanoid Robot Games — Episode 3', collections: ['featured', 'robot-games'], order: 80 },
    { id: '1PQo5tXtH4Q', title: 'World Humanoid Robot Games — Episode 2', collections: ['featured', 'robot-games'], order: 70 },
    { id: '1POKURp4G2c', title: 'World Humanoid Robot Games — Episode 1', collections: ['featured', 'robot-games'], order: 60 },
    { id: '1PNdFcjqPLO', title: 'World Humanoid Robot Games — Opening Ceremony', collections: ['featured', 'robot-games'], order: 50 },
    { id: '1PLFT9fmR4k', title: 'Inside the 2026 World Robot Conference', collections: ['featured', 'technology'], order: 40 },
    { id: '1PKWsZSgjUA', title: 'World Robot Conference 2026', collections: ['featured', 'technology'], order: 30 },
    { id: '1PIhSuZUqiI', title: 'The Next Wave in Robotics', collections: ['featured', 'technology'], order: 20 }
  ];
  var playlistCache = {};
  var taxonomy = {
    Movies: [
      { id: 'popular', label: 'Popular', source: 'tmdb', endpoint: 'movie/popular', mediaType: 'movie' },
      { id: 'now-playing', label: 'Now Playing', source: 'tmdb', endpoint: 'movie/now_playing', mediaType: 'movie' },
      { id: 'upcoming', label: 'Upcoming', source: 'tmdb', endpoint: 'movie/upcoming', mediaType: 'movie' },
      { id: 'top-rated', label: 'Top Rated', source: 'tmdb', endpoint: 'movie/top_rated', mediaType: 'movie', local: { minRating: 8 } },
      { id: 'action', label: 'Action', source: 'tmdb', endpoint: 'discover/movie', mediaType: 'movie', params: { with_genres: '28', sort_by: 'popularity.desc' }, local: { terms: ['action'] } },
      { id: 'comedy', label: 'Comedy', source: 'tmdb', endpoint: 'discover/movie', mediaType: 'movie', params: { with_genres: '35', sort_by: 'popularity.desc' }, local: { terms: ['comedy'] } },
      { id: 'horror', label: 'Horror', source: 'tmdb', endpoint: 'discover/movie', mediaType: 'movie', params: { with_genres: '27', sort_by: 'popularity.desc' }, local: { terms: ['horror'] } },
      { id: 'sci-fi', label: 'Sci-Fi', source: 'tmdb', endpoint: 'discover/movie', mediaType: 'movie', params: { with_genres: '878', sort_by: 'popularity.desc' }, local: { terms: ['sci-fi', 'science fiction'] } },
      { id: 'family', label: 'Family', source: 'tmdb', endpoint: 'discover/movie', mediaType: 'movie', params: { with_genres: '10751', sort_by: 'popularity.desc' }, local: { terms: ['family'] } },
      { id: 'documentary', label: 'Documentary', source: 'tmdb', endpoint: 'discover/movie', mediaType: 'movie', params: { with_genres: '99', sort_by: 'popularity.desc' }, local: { terms: ['documentary'] } }
    ],
    'TV Shows': [
      { id: 'popular', label: 'Popular', source: 'tmdb', endpoint: 'tv/popular', mediaType: 'tv' },
      { id: 'airing-today', label: 'Airing Today', source: 'tmdb', endpoint: 'tv/airing_today', mediaType: 'tv' },
      { id: 'on-tv', label: 'On TV', source: 'tmdb', endpoint: 'tv/on_the_air', mediaType: 'tv' },
      { id: 'top-rated', label: 'Top Rated', source: 'tmdb', endpoint: 'tv/top_rated', mediaType: 'tv', local: { minRating: 8 } },
      { id: 'drama', label: 'Drama', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'tv', params: { with_genres: '18', sort_by: 'popularity.desc' }, local: { terms: ['drama'] } },
      { id: 'comedy', label: 'Comedy', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'tv', params: { with_genres: '35', sort_by: 'popularity.desc' }, local: { terms: ['comedy'] } },
      { id: 'crime', label: 'Crime', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'tv', params: { with_genres: '80', sort_by: 'popularity.desc' }, local: { terms: ['crime'] } },
      { id: 'reality', label: 'Reality', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'tv', params: { with_genres: '10764', sort_by: 'popularity.desc' }, local: { terms: ['reality'] } },
      { id: 'documentary', label: 'Documentary', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'tv', params: { with_genres: '99', sort_by: 'popularity.desc' }, local: { terms: ['documentary'] } }
    ],
    Anime: [
      { id: 'popular', label: 'Popular', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'anime', params: { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc' } },
      { id: 'airing-today', label: 'Airing Today', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'anime', params: { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc', 'air_date.gte': '$today', 'air_date.lte': '$today' } },
      { id: 'top-rated', label: 'Top Rated', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'anime', params: { with_genres: '16', with_original_language: 'ja', sort_by: 'vote_average.desc', 'vote_count.gte': '200' }, local: { minRating: 8 } },
      { id: 'action', label: 'Action', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'anime', params: { with_genres: '16,10759', with_original_language: 'ja', sort_by: 'popularity.desc' }, local: { terms: ['action', 'adventure'] } },
      { id: 'fantasy', label: 'Sci-Fi & Fantasy', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'anime', params: { with_genres: '16,10765', with_original_language: 'ja', sort_by: 'popularity.desc' }, local: { terms: ['fantasy', 'sci-fi', 'science fiction'] } },
      { id: 'comedy', label: 'Comedy', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'anime', params: { with_genres: '16,35', with_original_language: 'ja', sort_by: 'popularity.desc' }, local: { terms: ['comedy'] } },
      { id: 'drama', label: 'Drama', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'anime', params: { with_genres: '16,18', with_original_language: 'ja', sort_by: 'popularity.desc' }, local: { terms: ['drama'] } },
      { id: 'kids', label: 'Kids', source: 'tmdb', endpoint: 'discover/tv', mediaType: 'anime', params: { with_genres: '16,10762', with_original_language: 'ja', sort_by: 'popularity.desc' }, local: { terms: ['kids', 'family'] } }
    ],
    Sports: [
      { id: 'featured-free', label: 'Featured Free', source: 'free-events', collection: 'featured' },
      { id: 'robot-games', label: 'Robot Games', source: 'free-events', collection: 'robot-games' },
      { id: 'all-sports', label: 'All Sports', source: 'iptv', playlistCategory: 'sports' },
      { id: 'football', label: 'American Football', source: 'iptv', playlistCategory: 'sports', sport: 'american-football', terms: ['nfl', 'american football', 'gridiron'] },
      { id: 'basketball', label: 'Basketball', source: 'iptv', playlistCategory: 'sports', sport: 'basketball', terms: ['basketball', 'nba', 'wnba'] },
      { id: 'baseball', label: 'Baseball', source: 'iptv', playlistCategory: 'sports', sport: 'baseball', terms: ['baseball', 'mlb'] },
      { id: 'hockey', label: 'Hockey', source: 'iptv', playlistCategory: 'sports', sport: 'hockey', terms: ['hockey', 'nhl'] },
      { id: 'soccer', label: 'Soccer', source: 'iptv', playlistCategory: 'sports', sport: 'soccer', terms: ['soccer', 'football', 'futbol', 'fútbol', 'premier league', 'uefa', 'fifa', 'la liga'] },
      { id: 'combat', label: 'Combat Sports', source: 'iptv', playlistCategory: 'sports', sport: 'combat', terms: ['boxing', 'mma', 'ufc', 'wrestling', 'fight'] },
      { id: 'motorsports', label: 'Motorsports', source: 'iptv', playlistCategory: 'sports', sport: 'motorsports', terms: ['motor', 'racing', 'formula', 'nascar', 'auto sport'] },
      { id: 'tennis-golf', label: 'Tennis & Golf', source: 'iptv', playlistCategory: 'sports', terms: ['tennis', 'golf', 'pga', 'atp', 'wta'] }
    ],
    'Live TV': [
      { id: 'featured', label: 'Featured', source: 'iptv', playlistCategory: 'general' },
      { id: 'special-events', label: 'Special Events', source: 'free-events', collection: 'featured' },
      { id: 'news', label: 'News', source: 'iptv', playlistCategory: 'news' },
      { id: 'entertainment', label: 'Entertainment', source: 'iptv', playlistCategory: 'entertainment' },
      { id: 'movies', label: 'Movie Channels', source: 'iptv', playlistCategory: 'movies' },
      { id: 'series', label: 'Series', source: 'iptv', playlistCategory: 'series' },
      { id: 'kids', label: 'Kids', source: 'iptv', playlistCategory: 'kids' },
      { id: 'animation', label: 'Animation', source: 'iptv', playlistCategory: 'animation' },
      { id: 'family', label: 'Family', source: 'iptv', playlistCategory: 'family' },
      { id: 'music', label: 'Music', source: 'iptv', playlistCategory: 'music' },
      { id: 'documentary', label: 'Documentary', source: 'iptv', playlistCategory: 'documentary' },
      { id: 'science', label: 'Science', source: 'iptv', playlistCategory: 'science' },
      { id: 'education', label: 'Education', source: 'iptv', playlistCategory: 'education' },
      { id: 'comedy', label: 'Comedy', source: 'iptv', playlistCategory: 'comedy' },
      { id: 'cooking', label: 'Cooking', source: 'iptv', playlistCategory: 'cooking' },
      { id: 'culture', label: 'Culture', source: 'iptv', playlistCategory: 'culture' },
      { id: 'lifestyle', label: 'Lifestyle', source: 'iptv', playlistCategory: 'lifestyle' },
      { id: 'outdoor', label: 'Outdoor', source: 'iptv', playlistCategory: 'outdoor' },
      { id: 'travel', label: 'Travel', source: 'iptv', playlistCategory: 'travel' },
      { id: 'business', label: 'Business', source: 'iptv', playlistCategory: 'business' },
      { id: 'auto', label: 'Auto', source: 'iptv', playlistCategory: 'auto' },
      { id: 'classic', label: 'Classic TV', source: 'iptv', playlistCategory: 'classic' },
      { id: 'public', label: 'Public Access', source: 'iptv', playlistCategory: 'public' },
      { id: 'relax', label: 'Relax', source: 'iptv', playlistCategory: 'relax' },
      { id: 'government', label: 'Government', source: 'iptv', playlistCategory: 'legislative' },
      { id: 'faith', label: 'Faith', source: 'iptv', playlistCategory: 'religious' },
      { id: 'shopping', label: 'Shopping', source: 'iptv', playlistCategory: 'shop' },
      { id: 'interactive', label: 'Interactive', source: 'iptv', playlistCategory: 'interactive' },
      { id: 'weather', label: 'Weather', source: 'iptv', playlistCategory: 'weather' }
    ]
  };

  function normalize(value) {
    return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function getFilters(section) {
    return (taxonomy[section] || []).map(function (filter) { return Object.assign({}, filter); });
  }

  function getFilter(section, filterId) {
    var filters = taxonomy[section] || [];
    return filters.filter(function (filter) { return filter.id === filterId; })[0] || filters[0] || null;
  }

  function defaultFilterId(section) {
    var filter = getFilter(section, '');
    return filter ? filter.id : '';
  }

  function buildTmdbRequest(section, filterId, page, today) {
    var filter = getFilter(section, filterId);
    if (!filter || filter.source !== 'tmdb') return null;
    var date = today || new Date().toISOString().slice(0, 10);
    var params = Object.assign({ include_adult: 'false', page: String(page || 1) }, filter.params || {});
    Object.keys(params).forEach(function (key) {
      if (params[key] === '$today') params[key] = date;
    });
    return { endpoint: filter.endpoint, mediaType: filter.mediaType, params: params };
  }

  function matchesLocalFilter(item, section, filterId) {
    var filter = getFilter(section, filterId);
    var rules = filter && (filter.local || (filter.terms ? { terms: filter.terms } : null));
    if (!filter || !rules) return true;
    if (rules.minRating && Number(item.rating || 0) < rules.minRating) return false;
    if (!rules.terms || !rules.terms.length) return true;
    var haystack = normalize([item.name, item.overview, item.summary, (item.sections || []).join(' '), item.section, item.meta].join(' '));
    return rules.terms.some(function (term) { return haystack.indexOf(normalize(term)) >= 0; });
  }

  function readAttributes(line) {
    var attributes = {};
    var pattern = /([\w-]+)="([^"]*)"/g;
    var match;
    while ((match = pattern.exec(line))) attributes[match[1]] = match[2];
    return attributes;
  }

  function parseM3u(text, options) {
    if (liveTvApi && typeof liveTvApi.parseM3u === 'function') return liveTvApi.parseM3u(text, options);
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
        pending = {
          id: attributes['tvg-id'] || '',
          name: comma >= 0 ? line.slice(comma + 1).trim() : (attributes['tvg-name'] || 'Live channel'),
          logo: attributes['tvg-logo'] || '',
          group: attributes['group-title'] || settings.category || 'Live TV'
        };
        requiresHeaders = false;
        return;
      }
      if (line.indexOf('#EXTVLCOPT:http-referrer=') === 0 || line.indexOf('#EXTVLCOPT:http-user-agent=') === 0 || line.indexOf('#EXTHTTP:') === 0) {
        requiresHeaders = true;
        return;
      }
      if (line.charAt(0) === '#' || !pending) return;
      var normalizedName = normalize(pending.name + ' ' + pending.group);
      var acceptable = line.indexOf('https://') === 0
        && !requiresHeaders
        && normalizedName.indexOf('adult') < 0
        && normalizedName.indexOf('xxx') < 0
        && !seen[line];
      if (acceptable) {
        seen[line] = true;
        entries.push({
          id: pending.id || ('live-' + normalize(pending.name).replace(/ /g, '-')),
          name: pending.name,
          logo: pending.logo,
          group: pending.group,
          url: line
        });
      }
      pending = null;
      requiresHeaders = false;
    });

    return entries;
  }

  function requestText(url) {
    if (playlistCache[url]) return playlistCache[url];
    var request;
    if (typeof fetch === 'function') {
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;
      request = fetch(url, controller ? { signal: controller.signal } : {}).then(function (response) {
        if (!response.ok) throw new Error('Live catalog request failed');
        return response.text();
      }).then(function (text) {
        if (timer) clearTimeout(timer);
        return text;
      }, function (error) {
        if (timer) clearTimeout(timer);
        throw error;
      });
    } else {
      request = new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 12000;
        xhr.onload = function () { xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.responseText) : reject(new Error('Live catalog request failed')); };
        xhr.onerror = function () { reject(new Error('Live catalog request failed')); };
        xhr.ontimeout = function () { reject(new Error('Live catalog request timed out')); };
        xhr.send();
      });
    }
    playlistCache[url] = request.catch(function (error) {
      delete playlistCache[url];
      throw error;
    });
    return playlistCache[url];
  }

  function requestJson(url) {
    if (typeof fetch === 'function') {
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;
      return fetch(url, controller ? { signal: controller.signal } : {}).then(function (response) {
        if (!response.ok) throw new Error('Free event request failed');
        return response.json();
      }).then(function (data) {
        if (timer) clearTimeout(timer);
        return data;
      }, function (error) {
        if (timer) clearTimeout(timer);
        throw error;
      });
    }
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 12000;
      xhr.onload = function () {
        if (xhr.status < 200 || xhr.status >= 300) { reject(new Error('Free event request failed')); return; }
        try { resolve(JSON.parse(xhr.responseText)); } catch (error) { reject(error); }
      };
      xhr.onerror = function () { reject(new Error('Free event request failed')); };
      xhr.ontimeout = function () { reject(new Error('Free event request timed out')); };
      xhr.send();
    });
  }

  function safeEventStreamUrl(value) {
    try {
      var url = new URL(String(value || ''));
      var allowedHost = url.hostname === 'live-stream.cgtn.com' || url.hostname === 'envod.cgtn.com';
      return url.protocol === 'https:' && allowedHost && /\.m3u8$/i.test(url.pathname) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function normalizeFreeEvent(definition, payload) {
    var data = payload && payload.status === 200 ? payload.data : null;
    if (!definition || !data) return null;
    var seen = {};
    var streams = (data.coverVideos || []).reduce(function (all, entry) {
      var url = safeEventStreamUrl(entry && entry.video && entry.video.url);
      if (!url || seen[url]) return all;
      seen[url] = true;
      all.push({ url: url, type: 'hls', quality: '', label: Number(data.live && data.live.status) === 2 ? 'Live' : 'Replay' });
      return all;
    }, []);
    if (!streams.length) return null;
    var liveStatus = Number(data.live && data.live.status);
    var eventStatus = liveStatus === 2 ? 'Live' : (liveStatus === 3 ? 'Replay' : 'Upcoming');
    var posterSizes = data.cover && data.cover.r_16_9;
    var poster = posterSizes && (
      (posterSizes.quality_med && posterSizes.quality_med.url)
      || (posterSizes.quality_max && posterSizes.quality_max.url)
      || (posterSizes.quality_min && posterSizes.quality_min.url)
    );
    var startedAt = Number(data.live && data.live.startTimeStr);
    return {
      id: 'cgtn-' + definition.id,
      catalogId: 'cgtn-' + definition.id,
      name: definition.title || data.longHeadline || 'Free live event',
      logo: /^https:\/\//.test(String(poster || '')) ? poster : '',
      group: 'Featured Free',
      groups: ['Featured Free', 'Robot & Technology Events'],
      categories: ['sports', 'technology', 'special-events'],
      countryCode: 'CN',
      countryName: 'China',
      countryFlag: '🇨🇳',
      languageCodes: ['eng'],
      languageNames: ['English'],
      sports: definition.collections.indexOf('robot-games') >= 0 ? ['robotics'] : [],
      url: streams[0].url,
      streams: streams,
      eventStatus: eventStatus,
      eventStart: Number.isFinite(startedAt) ? new Date(startedAt).toISOString() : '',
      sourceName: 'CGTN',
      sourceDescription: 'Official free ' + eventStatus.toLowerCase() + ' coverage from CGTN, played directly inside Harbor.',
      summary: data.summary || (data.shareBody && data.shareBody.summary) || 'Official free coverage from CGTN.',
      providerUrl: data.shareBody && /^https:\/\//.test(String(data.shareBody.shareUrl || '')) ? data.shareBody.shareUrl : '',
      collections: definition.collections.slice(),
      order: Number(definition.order) || 0
    };
  }

  function storageTarget(storage) {
    if (storage && typeof storage.getItem === 'function') return storage;
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (_) { return null; }
  }

  function sanitizeCachedFreeEvent(value) {
    if (!value || typeof value !== 'object') return null;
    var streams = (Array.isArray(value.streams) ? value.streams : []).reduce(function (all, stream) {
      var url = safeEventStreamUrl(stream && stream.url);
      if (url && !all.some(function (entry) { return entry.url === url; })) all.push({ url: url, type: 'hls', quality: '', label: stream.label === 'Live' ? 'Live' : 'Replay' });
      return all;
    }, []);
    if (!streams.length || !/^cgtn-[a-zA-Z0-9]+$/.test(String(value.id || ''))) return null;
    return Object.assign({}, value, { url: streams[0].url, streams: streams });
  }

  function readFreeEventSnapshot(storage) {
    var target = storageTarget(storage);
    if (!target) return [];
    try {
      var snapshot = JSON.parse(target.getItem(FREE_EVENT_CACHE_KEY) || 'null');
      if (!snapshot || Date.now() - Number(snapshot.savedAt || 0) > FREE_EVENT_CACHE_TTL_MS) return [];
      return (snapshot.events || []).map(sanitizeCachedFreeEvent).filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  function writeFreeEventSnapshot(storage, events) {
    var target = storageTarget(storage);
    if (!target) return;
    try { target.setItem(FREE_EVENT_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), events: events })); } catch (_) {}
  }

  function filterFreeEvents(events, collection, options) {
    var settings = options || {};
    var query = normalize(settings.query || '');
    return events.filter(function (event) {
      if (collection && event.collections.indexOf(collection) < 0) return false;
      if (settings.country && event.countryCode !== settings.country) return false;
      if (settings.language && event.languageCodes.indexOf(settings.language) < 0) return false;
      if (query) {
        var text = normalize([event.name, event.summary, event.sourceName, event.eventStatus].join(' '));
        if (!query.split(' ').every(function (token) { return text.indexOf(token) >= 0; })) return false;
      }
      return true;
    }).sort(function (left, right) {
      return Number(right.eventStatus === 'Live') - Number(left.eventStatus === 'Live')
        || Number(right.order || 0) - Number(left.order || 0);
    });
  }

  function freeEventFacets(events) {
    return {
      countries: events.length ? [{ code: 'CN', name: 'China', flag: '🇨🇳' }] : [],
      languages: events.length ? [{ code: 'eng', name: 'English' }] : [],
      sports: events.some(function (event) { return event.sports.indexOf('robotics') >= 0; }) ? [{ id: 'robotics', name: 'Robot Sports' }] : []
    };
  }

  function loadFreeEventDirectory(collection, options) {
    var settings = options || {};
    var now = Date.now();
    var useMemory = freeEventMemory.events.length && now - freeEventMemory.savedAt < FREE_EVENT_REFRESH_MS;
    var source = useMemory
      ? Promise.resolve({ events: freeEventMemory.events, cached: false })
      : Promise.all(freeEventDefinitions.map(function (definition) {
        return requestJson(FREE_EVENT_API_BASE + encodeURIComponent(definition.id))
          .then(function (payload) { return normalizeFreeEvent(definition, payload); })
          .catch(function () { return null; });
      })).then(function (events) {
        events = events.filter(Boolean);
        if (events.length) {
          freeEventMemory = { savedAt: Date.now(), events: events };
          writeFreeEventSnapshot(settings.storage, events);
          return { events: events, cached: false };
        }
        var snapshot = readFreeEventSnapshot(settings.storage);
        if (snapshot.length) return { events: snapshot, cached: true };
        throw new Error('Official free events are temporarily unavailable');
      });
    return source.then(function (result) {
      var filtered = filterFreeEvents(result.events, collection, settings);
      return {
        channels: filtered.slice(0, Number(settings.limit) || 60),
        facets: freeEventFacets(result.events),
        total: filtered.length,
        cached: result.cached
      };
    });
  }

  function loadLiveChannels(section, filterId, limit) {
    return loadLiveDirectory(section, filterId, typeof limit === 'object' ? limit : { limit: limit }).then(function (directory) {
      return directory.channels;
    });
  }

  function loadLiveDirectory(section, filterId, options) {
    var filter = getFilter(section, filterId);
    if (!filter) return Promise.resolve({ channels: [], facets: { countries: [], languages: [], sports: [] }, total: 0, cached: false });
    if (filter.source === 'free-events') return loadFreeEventDirectory(filter.collection || 'featured', options);
    if (filter.source !== 'iptv') return Promise.resolve({ channels: [], facets: { countries: [], languages: [], sports: [] }, total: 0, cached: false });
    var url = IPTV_BASE + filter.playlistCategory + '.m3u';
    if (liveTvApi && typeof liveTvApi.loadDirectory === 'function') {
      return liveTvApi.loadDirectory(url, Object.assign({}, options || {}, {
        playlistCategory: filter.playlistCategory,
        sport: filter.sport || '',
        terms: filter.terms || []
      }));
    }
    return requestText(url).then(function (text) {
      var entries = parseM3u(text, { category: filter.label });
      if (filter.terms && filter.terms.length) {
        entries = entries.filter(function (entry) {
          var name = normalize(entry.name + ' ' + entry.group);
          return filter.terms.some(function (term) { return name.indexOf(normalize(term)) >= 0; });
        });
      }
      entries.sort(function (left, right) {
        return Number(Boolean(right.logo)) - Number(Boolean(left.logo)) || left.name.localeCompare(right.name);
      });
      return {
        channels: entries.slice(0, Number(options && options.limit) || 60),
        facets: { countries: [], languages: [], sports: [] },
        total: entries.length,
        cached: false
      };
    });
  }

  function loadLiveGuide(channelId, feedId, options) {
    if (!liveTvApi || typeof liveTvApi.loadGuide !== 'function') return Promise.resolve({ status: 'unavailable', programmes: [] });
    return liveTvApi.loadGuide(channelId, feedId, options);
  }

  function scheduledChannel(channel, programme, windowName) {
    var start = new Date(programme.start).getTime();
    return Object.assign({}, channel, {
      id: 'schedule-' + String(channel.id || channel.channelId || channel.name || 'channel') + '-' + start,
      catalogId: 'schedule-' + String(channel.id || channel.channelId || channel.name || 'channel') + '-' + start,
      name: programme.title || channel.name || 'Upcoming programme',
      channelName: channel.name || '',
      eventStatus: 'Upcoming',
      eventStart: programme.start,
      eventStop: programme.stop,
      scheduleWindow: windowName,
      group: windowName,
      groups: [windowName, 'Live Soon', channel.name || 'Live channel'].concat(channel.groups || []),
      summary: [programme.description || '', channel.name ? 'Coming up on ' + channel.name + '.' : ''].filter(Boolean).join(' '),
      sourceDescription: 'A published programme listing that will play on its live channel inside Harbor.'
    });
  }

  function loadLiveWindowDirectory(section, filterId, options) {
    var settings = options || {};
    var windowName = settings.liveWindow === 'soon' ? 'soon' : 'now';
    return loadLiveDirectory(section, filterId, settings).then(function (directory) {
      if (windowName === 'now') {
        var current = directory.channels.filter(function (channel) {
          return !channel.eventStatus || channel.eventStatus === 'Live';
        });
        return Object.assign({}, directory, { channels: current, total: current.length, liveWindow: 'now' });
      }

      var guideNow = settings.now instanceof Date ? settings.now : new Date(settings.now || Date.now());
      var timestamp = guideNow.getTime();
      var horizon = timestamp + 7 * 24 * 60 * 60 * 1000;
      var directUpcoming = directory.channels.filter(function (channel) {
        var start = new Date(channel.eventStart || '').getTime();
        return channel.eventStatus === 'Upcoming' && Number.isFinite(start) && start > timestamp && start <= horizon;
      }).map(function (channel) {
        var start = new Date(channel.eventStart).getTime();
        var nextDay = new Date(timestamp); nextDay.setHours(24, 0, 0, 0);
        return Object.assign({}, channel, {
          scheduleWindow: start < nextDay.getTime() ? 'Later today' : 'Later this week',
          groups: [start < nextDay.getTime() ? 'Later today' : 'Later this week', 'Live Soon'].concat(channel.groups || [])
        });
      });

      var guideRequests = directory.channels.filter(function (channel) { return channel.channelId; }).map(function (channel) {
        return loadLiveGuide(channel.channelId, channel.feedId, { now: guideNow, horizonDays: 7, limit: 500 }).then(function (guide) {
          var grouped = groupLiveGuide(guide.programmes, guideNow);
          return grouped.laterToday.slice(0, 12).map(function (programme) { return scheduledChannel(channel, programme, 'Later today'); })
            .concat(grouped.laterThisWeek.slice(0, 28).map(function (programme) { return scheduledChannel(channel, programme, 'Later this week'); }));
        });
      });

      return Promise.all(guideRequests).then(function (groups) {
        var seen = {};
        var upcoming = directUpcoming.concat(groups.reduce(function (all, entries) { return all.concat(entries); }, []))
          .filter(function (entry) {
            if (seen[entry.id]) return false;
            seen[entry.id] = true;
            return true;
          })
          .sort(function (left, right) { return new Date(left.eventStart) - new Date(right.eventStart); });
        return Object.assign({}, directory, {
          channels: upcoming.slice(0, Number(settings.limit) || 160),
          total: upcoming.length,
          liveWindow: 'soon'
        });
      });
    });
  }

  function groupLiveGuide(programmes, now) {
    if (!liveTvApi || typeof liveTvApi.groupGuideProgrammes !== 'function') {
      return { liveNow: [], laterToday: [], laterThisWeek: [] };
    }
    return liveTvApi.groupGuideProgrammes(programmes, now);
  }

  function markLiveStreamFailure(url, storage) {
    if (liveTvApi && typeof liveTvApi.markStreamFailure === 'function') liveTvApi.markStreamFailure(url, storage);
  }

  function markLiveStreamSuccess(url, storage) {
    if (liveTvApi && typeof liveTvApi.markStreamSuccess === 'function') liveTvApi.markStreamSuccess(url, storage);
  }

  return {
    taxonomy: taxonomy,
    getFilters: getFilters,
    getFilter: getFilter,
    defaultFilterId: defaultFilterId,
    buildTmdbRequest: buildTmdbRequest,
    matchesLocalFilter: matchesLocalFilter,
    parseM3u: parseM3u,
    loadLiveChannels: loadLiveChannels,
    loadLiveDirectory: loadLiveDirectory,
    loadLiveWindowDirectory: loadLiveWindowDirectory,
    loadLiveGuide: loadLiveGuide,
    groupLiveGuide: groupLiveGuide,
    formatScheduledChannel: scheduledChannel,
    markLiveStreamFailure: markLiveStreamFailure,
    markLiveStreamSuccess: markLiveStreamSuccess,
    freeEventDefinitions: freeEventDefinitions.map(function (definition) { return Object.assign({}, definition, { collections: definition.collections.slice() }); }),
    safeEventStreamUrl: safeEventStreamUrl,
    normalizeFreeEvent: normalizeFreeEvent,
    filterFreeEvents: filterFreeEvents,
    loadFreeEventDirectory: loadFreeEventDirectory
  };
}));
