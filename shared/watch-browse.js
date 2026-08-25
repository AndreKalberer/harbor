(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarborWatchBrowse = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var IPTV_BASE = 'https://iptv-org.github.io/iptv/categories/';
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
      { id: 'all-sports', label: 'All Sports', source: 'iptv', playlistCategory: 'sports' },
      { id: 'football', label: 'NFL & Football', source: 'iptv', playlistCategory: 'sports', terms: ['nfl', 'american football', 'gridiron', 'football'] },
      { id: 'basketball', label: 'Basketball', source: 'iptv', playlistCategory: 'sports', terms: ['basketball', 'nba', 'wnba'] },
      { id: 'baseball', label: 'Baseball', source: 'iptv', playlistCategory: 'sports', terms: ['baseball', 'mlb'] },
      { id: 'hockey', label: 'Hockey', source: 'iptv', playlistCategory: 'sports', terms: ['hockey', 'nhl'] },
      { id: 'soccer', label: 'Soccer', source: 'iptv', playlistCategory: 'sports', terms: ['soccer', 'futbol', 'fútbol', 'premier league', 'uefa', 'fifa', 'la liga'] },
      { id: 'combat', label: 'Combat Sports', source: 'iptv', playlistCategory: 'sports', terms: ['boxing', 'mma', 'ufc', 'wrestling', 'fight'] },
      { id: 'motorsports', label: 'Motorsports', source: 'iptv', playlistCategory: 'sports', terms: ['motor', 'racing', 'formula', 'nascar', 'auto sport'] },
      { id: 'tennis-golf', label: 'Tennis & Golf', source: 'iptv', playlistCategory: 'sports', terms: ['tennis', 'golf', 'pga', 'atp', 'wta'] }
    ],
    'Live TV': [
      { id: 'featured', label: 'Featured', source: 'iptv', playlistCategory: 'general' },
      { id: 'news', label: 'News', source: 'iptv', playlistCategory: 'news' },
      { id: 'entertainment', label: 'Entertainment', source: 'iptv', playlistCategory: 'entertainment' },
      { id: 'movies', label: 'Movie Channels', source: 'iptv', playlistCategory: 'movies' },
      { id: 'kids', label: 'Kids', source: 'iptv', playlistCategory: 'kids' },
      { id: 'music', label: 'Music', source: 'iptv', playlistCategory: 'music' },
      { id: 'documentary', label: 'Documentary', source: 'iptv', playlistCategory: 'documentary' },
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

  function loadLiveChannels(section, filterId, limit) {
    var filter = getFilter(section, filterId);
    if (!filter || filter.source !== 'iptv') return Promise.resolve([]);
    var url = IPTV_BASE + filter.playlistCategory + '.m3u';
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
      return entries.slice(0, limit || 60);
    });
  }

  return {
    taxonomy: taxonomy,
    getFilters: getFilters,
    getFilter: getFilter,
    defaultFilterId: defaultFilterId,
    buildTmdbRequest: buildTmdbRequest,
    matchesLocalFilter: matchesLocalFilter,
    parseM3u: parseM3u,
    loadLiveChannels: loadLiveChannels
  };
}));
