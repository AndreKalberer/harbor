(function () {
  'use strict';

  var TMDB_KEY = String(window.HARBOR_CONFIG && window.HARBOR_CONFIG.tmdbApiKey || '').trim();
  var TMDB_IMAGE = 'https://image.tmdb.org/t/p/w780';
  var seriesMetadataApi = window.HarborSeriesMetadata;
  var watchBrowseApi = window.HarborWatchBrowse;
  var STATE_KEY = 'harbor:tv-state:v1';
  var sections = {
    Home: ['All', 'Continue', 'My List'],
    Watch: ['All', 'Movies', 'TV Shows', 'Anime', 'Sports', 'Live TV']
  };
  var liveItems = [
    { id: 'live-sports', name: 'World Sports HD', category: 'Watch', type: 'live', section: 'Sports', meta: 'Live · Sports', summary: 'A live sports demo channel built for the Harbor TV player.', directStream: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
    { id: 'live-news', name: 'Global News 24/7', category: 'Watch', type: 'live', section: 'Live TV', meta: 'Live · News', summary: 'A continuous live-news demo channel.', directStream: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }
  ];
  var fallbackWatch = [
    { id: 'movie-693134', tmdbId: '693134', name: 'Dune: Part Two', category: 'Watch', type: 'movie', section: 'Movies', meta: '2024 · Movie', summary: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.', image: TMDB_IMAGE + '/eZ239CUp1d6OryZEBPnO2n87gMG.jpg' },
    { id: 'movie-157336', tmdbId: '157336', name: 'Interstellar', category: 'Watch', type: 'movie', section: 'Movies', meta: '2014 · Movie', summary: 'Explorers travel through a wormhole in space in an attempt to ensure humanity survives.', image: TMDB_IMAGE + '/vgnoBSVzWAV9sNQUORaDGvDp7wx.jpg' },
    { id: 'tv-1399', tmdbId: '1399', name: 'Game of Thrones', category: 'Watch', type: 'tv', section: 'TV Shows', meta: '2011 · Series', summary: 'Noble families fight for control over the lands of Westeros.', image: TMDB_IMAGE + '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg' },
    { id: 'anime-1429', tmdbId: '1429', name: 'Attack on Titan', category: 'Watch', type: 'anime', section: 'Anime', meta: '2013 · Anime', summary: 'Humanity fights for survival against towering enemies.', image: TMDB_IMAGE + '/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg' },
    { id: 'anime-30984', tmdbId: '30984', name: 'Bleach', category: 'Watch', type: 'anime', section: 'Anime', meta: '2004 · Anime', summary: 'Ichigo Kurosaki becomes a Soul Reaper and protects the living and the dead from Hollows.', image: TMDB_IMAGE + '/5iVUUnE2tgBPypACYNobCKHagfV.jpg' }
  ];
  var TMDB_GENRE_LABELS = {
    16: 'Animation', 18: 'Drama', 27: 'Horror', 28: 'Action', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 878: 'Sci-Fi', 10751: 'Family', 10759: 'Action & Adventure',
    10762: 'Kids', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy'
  };
  var offlineSeriesMetadata = {
    '1399': { seasons: [
      { season_number: 1, name: 'Season 1', episode_count: 10 }, { season_number: 2, name: 'Season 2', episode_count: 10 },
      { season_number: 3, name: 'Season 3', episode_count: 10 }, { season_number: 4, name: 'Season 4', episode_count: 10 },
      { season_number: 5, name: 'Season 5', episode_count: 10 }, { season_number: 6, name: 'Season 6', episode_count: 10 },
      { season_number: 7, name: 'Season 7', episode_count: 7 }, { season_number: 8, name: 'Season 8', episode_count: 6 }
    ] },
    '1429': { seasons: [
      { season_number: 1, name: 'Season 1', episode_count: 25 }, { season_number: 2, name: 'Season 2', episode_count: 12 },
      { season_number: 3, name: 'Season 3', episode_count: 22 }, { season_number: 4, name: 'The Final Season', episode_count: 28 }
    ] },
    '30984': { seasons: [
      { season_number: 1, name: 'Bleach', episode_count: 366 },
      { season_number: 2, name: 'Thousand-Year Blood War', episode_count: 50 }
    ] }
  };

  var state = { section: 'Watch', subcategory: 'All', watchFilter: '', liveCountry: '', liveLanguage: '', liveFacets: { countries: [], languages: [], sports: [] }, liveTotal: 0, liveCached: false, page: 1, items: [], active: null, saved: [], history: [], query: '', canLoadMore: false, loading: false, seasons: [], season: 1, episode: 1, episodePage: 0, playerRoutes: [], playerRouteIndex: 0, playerMode: '' };
  var seriesMetadataCache = {};
  var itemLoadGeneration = 0;
  var playerReady = false;
  var EPISODE_PAGE_SIZE = 30;
  var playerRouteTimer = null;
  var playerReadyTimer = null;
  var playerControlTimer = null;
  var playerHls = null;
  var liveStreamCandidates = [];
  var liveStreamIndex = 0;
  var liveStreamRecoveryAttempts = 0;
  var liveGuideGeneration = 0;
  var focusBeforeOverlay = null;
  try {
    var stored = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
    state.saved = Array.isArray(stored.saved) ? stored.saved : [];
    state.history = Array.isArray(stored.history) ? stored.history : [];
  } catch (_) {}

  var hero = document.getElementById('hero');
  var heroKicker = document.getElementById('hero-kicker');
  var heroTitle = document.getElementById('hero-title');
  var heroSummary = document.getElementById('hero-summary');
  var heroPlay = document.getElementById('hero-play');
  var heroSave = document.getElementById('hero-save');
  var subcategoryRow = document.getElementById('subcategory-row');
  var watchFilterRow = document.getElementById('watch-filter-row');
  var liveFilterRow = document.getElementById('live-filter-row');
  var liveCountrySelect = document.getElementById('live-country-select');
  var liveLanguageSelect = document.getElementById('live-language-select');
  var liveFilterDone = document.getElementById('live-filter-done');
  var liveDirectoryStatus = document.getElementById('live-directory-status');
  var cardGrid = document.getElementById('card-grid');
  var rowKicker = document.getElementById('row-kicker');
  var rowTitle = document.getElementById('row-title');
  var resultCount = document.getElementById('result-count');
  var moreButton = document.getElementById('more-button');
  var searchPanel = document.getElementById('search-panel');
  var searchForm = document.getElementById('search-form');
  var searchInput = document.getElementById('search-input');
  var searchSubmit = searchForm.querySelector('button[type="submit"]');
  var searchBack = searchPanel.querySelector('[data-close="search"]');
  var detailPanel = document.getElementById('detail-panel');
  var detailTitle = document.getElementById('detail-title');
  var detailKicker = document.getElementById('detail-kicker');
  var detailMeta = document.getElementById('detail-meta');
  var detailSummary = document.getElementById('detail-summary');
  var detailLiveGuide = document.getElementById('detail-live-guide');
  var detailGuideStatus = document.getElementById('detail-guide-status');
  var detailGuideList = document.getElementById('detail-guide-list');
  var detailPlay = document.getElementById('detail-play');
  var detailSave = document.getElementById('detail-save');
  var episodeBrowser = document.getElementById('episode-browser');
  var seasonSelect = document.getElementById('season-select');
  var episodeCaption = document.getElementById('episode-caption');
  var episodeGrid = document.getElementById('episode-grid');
  var episodePrevious = document.getElementById('episode-previous');
  var episodeNext = document.getElementById('episode-next');
  var playerPanel = document.getElementById('player-panel');
  var playerTitle = document.getElementById('player-title');
  var playerEpisodeLabel = document.getElementById('player-episode-label');
  var playerStatus = document.getElementById('player-status');
  var playerStatusTitle = document.getElementById('player-status-title');
  var playerStatusDetail = document.getElementById('player-status-detail');
  var playerRetry = document.getElementById('player-retry');
  var playerBack = document.getElementById('player-back');
  var tvFrame = document.getElementById('tv-frame');
  var tvVideo = document.getElementById('tv-video');
  var tvAudio = document.getElementById('tv-audio');
  var toast = document.getElementById('toast');
  var toastTimer = null;

  function persist() {
    localStorage.setItem(STATE_KEY, JSON.stringify({ saved: state.saved.slice(0, 100), history: state.history.slice(0, 100) }));
  }

  function snapshot(item, resume) {
    var saved = { id: item.id, tmdbId: item.tmdbId || '', name: item.name, category: item.category, type: item.type, section: item.section || '', tags: item.tags || [], meta: item.meta || '', summary: item.summary || '', image: item.image || '', url: item.url || '', preview: item.preview || '', directStream: item.directStream || '', channelId: item.channelId || '', feedId: item.feedId || '', countryCode: item.countryCode || '', countryName: item.countryName || '', countryFlag: item.countryFlag || '', languageCodes: item.languageCodes || [], languageNames: item.languageNames || [], liveCategories: item.liveCategories || [], sports: item.sports || [], streamCandidates: (item.streamCandidates || []).slice(0, 4) };
    if (resume) saved.resume = { season: resume.season, episode: resume.episode };
    else if (item.resume) saved.resume = { season: item.resume.season, episode: item.resume.episode };
    return saved;
  }

  function isSaved(item) {
    return Boolean(item && state.saved.some(function (entry) { return entry.id === item.id; }));
  }

  function notify(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('visible'); }, 2200);
  }

  function toggleSaved(item) {
    if (!item) return;
    if (isSaved(item)) {
      state.saved = state.saved.filter(function (entry) { return entry.id !== item.id; });
      notify('Removed from My Harbor');
    } else {
      state.saved.unshift(snapshot(item));
      notify('Saved to My Harbor');
    }
    persist();
    updateSaveButtons();
    renderCards();
  }

  function updateSaveButtons() {
    var saved = isSaved(state.active);
    heroSave.textContent = saved ? '✓ In My List' : '＋ My List';
    detailSave.textContent = saved ? '✓ In My List' : '＋ My List';
    heroSave.setAttribute('aria-pressed', String(saved));
    detailSave.setAttribute('aria-pressed', String(saved));
  }

  function requestJson(url) {
    if (typeof AbortController !== 'function' && typeof XMLHttpRequest === 'function') {
      return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();
        try {
          request.open('GET', url, true);
          request.timeout = 9000;
          request.setRequestHeader('Accept', 'application/json');
          request.onload = function () {
            if (request.status < 200 || request.status >= 300) {
              reject(new Error('Request failed'));
              return;
            }
            try {
              resolve(JSON.parse(request.responseText));
            } catch (_error) {
              reject(new Error('Invalid response'));
            }
          };
          request.onerror = function () { reject(new Error('Request failed')); };
          request.ontimeout = function () {
            request.abort();
            reject(new Error('Request timed out'));
          };
          request.send();
        } catch (error) {
          request.abort();
          reject(error);
        }
      });
    }

    var controller = new AbortController();
    var timer = null;
    var fetchRequest = fetch(url, { signal: controller.signal }).then(function (response) {
      if (!response.ok) throw new Error('Request failed');
      return response.json();
    });
    var timeoutRequest = new Promise(function (_resolve, reject) {
      timer = setTimeout(function () {
        controller.abort();
        reject(new Error('Request timed out'));
      }, 9000);
    });
    return Promise.race([fetchRequest, timeoutRequest]).then(function (data) {
      clearTimeout(timer);
      return data;
    }, function (error) {
      clearTimeout(timer);
      throw error;
    });
  }

  function normalizeTmdb(item, type) {
    var mediaType = type || item.media_type || (item.title ? 'movie' : 'tv');
    if (mediaType === 'person') return null;
    var isAnime = mediaType !== 'movie'
      && (item.genre_ids || []).indexOf(16) >= 0
      && (item.original_language === 'ja' || (item.origin_country || []).indexOf('JP') >= 0);
    if (isAnime) mediaType = 'anime';
    return {
      id: mediaType + '-' + item.id,
      tmdbId: String(item.id),
      name: item.title || item.name || 'Untitled',
      category: 'Watch',
      type: mediaType,
      section: mediaType === 'movie' ? 'Movies' : isAnime ? 'Anime' : 'TV Shows',
      tags: (item.genre_ids || []).map(function (genreId) { return TMDB_GENRE_LABELS[genreId]; }).filter(Boolean),
      meta: (item.release_date || item.first_air_date || '').slice(0, 4) + ' · ' + (mediaType === 'movie' ? 'Movie' : isAnime ? 'Anime' : 'Series'),
      summary: item.overview || 'Open this title in Harbor.',
      image: item.backdrop_path || item.poster_path ? TMDB_IMAGE + (item.backdrop_path || item.poster_path) : ''
    };
  }

  function liveItemId(entry, index) {
    return 'iptv-' + String(entry.id || entry.channelId || entry.name || index).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  }

  function normalizeLiveChannel(entry, index, filter) {
    return {
      id: liveItemId(entry, index),
      name: entry.name || 'Live channel',
      category: 'Watch',
      type: 'live',
      section: state.subcategory,
      tags: [filter.label || entry.group || state.subcategory].concat(entry.groups || []).concat(entry.languageNames || []),
      meta: ['Live', entry.countryFlag, entry.countryName, (entry.languageNames || []).join(', '), entry.streams && entry.streams[0] && entry.streams[0].quality].filter(Boolean).join(' · '),
      summary: ['A public live channel from the IPTV-org catalog, played directly inside Harbor.', entry.countryName || '', (entry.languageNames || []).join(', ')].filter(Boolean).join(' · '),
      image: entry.logo || '',
      directStream: entry.url,
      channelId: entry.channelId || '',
      feedId: entry.feedId || '',
      countryCode: entry.countryCode || '',
      countryName: entry.countryName || '',
      countryFlag: entry.countryFlag || '',
      languageCodes: entry.languageCodes || [],
      languageNames: entry.languageNames || [],
      liveCategories: entry.categories || [],
      sports: entry.sports || [],
      streamCandidates: (entry.streams || []).map(function (stream) { return Object.assign({}, stream); })
    };
  }

  function normalizeItunes(item, type) {
    return {
      id: 'listen-' + (item.trackId || item.collectionId || item.artistId || item.trackName),
      name: item.trackName || item.collectionName || item.artistName || 'Audio',
      category: 'Listen',
      type: type || (item.kind === 'podcast' ? 'podcast' : 'music'),
      section: type === 'podcast' ? 'Podcasts' : type === 'audiobook' ? 'Audiobooks' : 'Music',
      meta: (item.artistName || item.primaryGenreName || 'Audio') + (item.releaseDate ? ' · ' + item.releaseDate.slice(0, 4) : ''),
      summary: item.longDescription || item.description || 'Listen to a preview in Harbor.',
      image: (item.artworkUrl100 || '').replace('100x100', '600x600'),
      preview: item.previewUrl || ''
    };
  }

  function normalizeBook(item, section) {
    var key = item.key || item.cover_edition_key || item.title;
    var subjects = (item.subject || []).map(function (value) { return String(value).toLowerCase(); });
    var derivedSection = section && section !== 'All' ? section
      : subjects.some(function (value) { return value.indexOf('manga') >= 0; }) ? 'Manga'
      : subjects.some(function (value) { return value.indexOf('light novel') >= 0; }) ? 'Light Novels'
      : subjects.some(function (value) { return value.indexOf('comic') >= 0 || value.indexOf('graphic novel') >= 0; }) ? 'Comics'
      : 'Books';
    return {
      id: 'read-' + key,
      name: item.title || 'Untitled book',
      category: 'Read',
      type: derivedSection === 'Manga' ? 'manga' : derivedSection === 'Comics' ? 'comic' : 'book',
      section: derivedSection,
      meta: (item.first_publish_year || 'Book') + (item.author_name && item.author_name[0] ? ' · ' + item.author_name[0] : ''),
      summary: 'Explore this title through Open Library.',
      image: item.cover_i ? 'https://covers.openlibrary.org/b/id/' + item.cover_i + '-L.jpg' : '',
      url: /^\/works\//.test(key) ? 'https://openlibrary.org' + key : 'https://openlibrary.org/search?q=' + encodeURIComponent(item.title || '')
    };
  }

  function fetchWatch(query, page) {
    if (state.subcategory === 'Sports' || state.subcategory === 'Live TV') {
      var liveFilter = watchBrowseApi.getFilter(state.subcategory, state.watchFilter);
      return watchBrowseApi.loadLiveDirectory(state.subcategory, state.watchFilter, {
        limit: 240,
        country: state.liveCountry,
        language: state.liveLanguage,
        query: query,
        platform: window.tizen ? 'tizen' : '',
        storage: localStorage
      }).then(function (directory) {
        state.liveFacets = directory.facets || { countries: [], languages: [], sports: [] };
        state.liveTotal = Number(directory.total) || directory.channels.length;
        state.liveCached = Boolean(directory.cached);
        return directory.channels.map(function (entry, index) { return normalizeLiveChannel(entry, index, liveFilter); });
      });
    }
    if (!TMDB_KEY) {
      var normalizedQuery = String(query || '').trim().toLowerCase();
      return Promise.resolve(fallbackWatch.concat(liveItems).filter(function (item) {
        var matchesQuery = !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery);
        return matchesQuery && matchesWatchSubcategory(item) && matchesWatchFilter(item);
      }));
    }
    var base = 'https://api.themoviedb.org/3/';
    var suffix = '?api_key=' + TMDB_KEY + '&include_adult=false&page=' + page;
    if (query) {
      var requests = [];
      if (state.subcategory === 'All' || state.subcategory === 'Movies') requests.push(requestJson(base + 'search/movie' + suffix + '&query=' + encodeURIComponent(query)).then(function (data) { return data.results.map(function (item) { return normalizeTmdb(item, 'movie'); }); }));
      if (state.subcategory === 'All' || state.subcategory === 'TV Shows' || state.subcategory === 'Anime') requests.push(requestJson(base + 'search/tv' + suffix + '&query=' + encodeURIComponent(query)).then(function (data) { return data.results.map(function (item) { return normalizeTmdb(item, 'tv'); }); }));
      return Promise.all(requests).then(function (groups) {
        return groups.reduce(function (all, group) { return all.concat(group); }, []).filter(function (item) { return item && matchesWatchSubcategory(item) && matchesWatchFilter(item) && itemMatchesQuery(item, query); });
      });
    }
    if (state.subcategory !== 'All') {
      var browseRequest = watchBrowseApi.buildTmdbRequest(state.subcategory, state.watchFilter, page);
      var parameters = Object.assign({ api_key: TMDB_KEY }, browseRequest.params);
      var browseQuery = Object.keys(parameters).map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(parameters[key]); }).join('&');
      return requestJson(base + browseRequest.endpoint + '?' + browseQuery).then(function (data) {
        return (data.results || []).map(function (item) {
          return normalizeTmdb(item, browseRequest.mediaType === 'movie' ? 'movie' : browseRequest.mediaType);
        }).filter(Boolean);
      });
    }
    return requestJson(base + 'trending/all/week' + suffix).then(function (data) { return data.results.map(function (item) { return normalizeTmdb(item, item.media_type); }).filter(Boolean); });
  }

  function syncOverlayAccessibility() {
    var overlayOpen = !searchPanel.hidden || !detailPanel.hidden || !playerPanel.hidden;
    document.querySelector('.tv-header').setAttribute('aria-hidden', overlayOpen ? 'true' : 'false');
    document.querySelector('main').setAttribute('aria-hidden', overlayOpen ? 'true' : 'false');
  }

  function fetchItunes(term, media, entity, type, page) {
    return requestJson('https://itunes.apple.com/search?term=' + encodeURIComponent(term) + '&media=' + media + '&entity=' + entity + '&limit=30&offset=' + ((page - 1) * 30)).then(function (data) {
      return data.results.map(function (item) { return normalizeItunes(item, type); }).filter(function (item) { return itemMatchesQuery(item, state.query ? term : ''); });
    });
  }

  function fetchRadio(query) {
    var radioUrl = query ? 'https://de1.api.radio-browser.info/json/stations/search?hidebroken=true&limit=30&name=' + encodeURIComponent(query) : 'https://de1.api.radio-browser.info/json/stations/topclick/30?hidebroken=true';
    return requestJson(radioUrl).then(function (items) { return items.map(function (item) { return { id: 'radio-' + item.stationuuid, name: item.name || 'Radio', category: 'Listen', type: 'radio', section: 'Radio', meta: (item.country || 'Radio') + (item.tags ? ' · ' + item.tags.split(',')[0] : ''), summary: 'Live radio in Harbor.', image: item.favicon || '', preview: item.url_resolved || item.url || '' }; }).filter(function (item) { return itemMatchesQuery(item, query); }); });
  }

  function fetchListen(query, page) {
    if (state.subcategory === 'All' && query) {
      return Promise.all([
        fetchItunes(query, 'music', 'song', 'music', page),
        fetchItunes(query, 'podcast', 'podcast', 'podcast', page),
        fetchItunes(query, 'audiobook', 'audiobook', 'audiobook', page),
        fetchRadio(query)
      ]).then(function (groups) { return groups.reduce(function (all, group) { return all.concat(group); }, []); });
    }
    var term = query || (state.subcategory === 'Soundtracks' ? 'movie soundtrack' : state.subcategory === 'Podcasts' ? 'popular' : state.subcategory === 'Audiobooks' ? 'bestseller' : 'top hits');
    var media = state.subcategory === 'Podcasts' ? 'podcast' : state.subcategory === 'Audiobooks' ? 'audiobook' : 'music';
    var entity = state.subcategory === 'Podcasts' ? 'podcast' : state.subcategory === 'Audiobooks' ? 'audiobook' : 'song';
    var type = state.subcategory === 'Podcasts' ? 'podcast' : state.subcategory === 'Audiobooks' ? 'audiobook' : 'music';
    if (state.subcategory === 'Radio') return fetchRadio(query);
    return fetchItunes(term, media, entity, type, page);
  }

  function fetchRead(query, page) {
    var subject = state.subcategory === 'Manga' ? 'manga' : state.subcategory === 'Comics' ? 'comics' : state.subcategory === 'Light Novels' ? 'light novel' : '';
    var term = query || subject || 'bestsellers';
    var qualified = subject && query ? query + ' subject:' + subject : term;
    return requestJson('https://openlibrary.org/search.json?q=' + encodeURIComponent(qualified) + '&page=' + page + '&limit=30&fields=key,title,author_name,first_publish_year,cover_i,subject').then(function (data) {
      return data.docs.map(function (item) { return normalizeBook(item, state.subcategory); }).filter(function (item) { return itemMatchesQuery(item, query); });
    });
  }

  function fetchCurrent(query, page) {
    if (state.section === 'Home') {
      if (state.subcategory === 'My List') return Promise.resolve(state.saved.filter(function (item) { return itemMatchesQuery(item, query); }));
      if (state.subcategory === 'Continue') return Promise.resolve(state.history.filter(function (item) { return itemMatchesQuery(item, query); }));
      if (query) return fetchWatch(query, page);
      return fetchWatch('', page);
    }
    return fetchWatch(query, page);
  }

  function renderSubcategories() {
    subcategoryRow.innerHTML = '';
    (sections[state.section] || ['All']).forEach(function (name) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'focusable' + (name === state.subcategory ? ' active' : '');
      button.setAttribute('aria-pressed', String(name === state.subcategory));
      button.textContent = name;
      button.addEventListener('click', function () {
        if (state.subcategory !== name) {
          state.liveCountry = '';
          state.liveLanguage = '';
          state.liveFacets = { countries: [], languages: [], sports: [] };
          state.liveTotal = 0;
          state.liveCached = false;
        }
        state.subcategory = name;
        state.watchFilter = state.section === 'Watch' && name !== 'All' ? watchBrowseApi.defaultFilterId(name) : '';
        state.query = ''; state.page = 1;
        loadItems(false).then(function () {
          if (state.subcategory !== name) return;
          var selected = Array.prototype.slice.call(subcategoryRow.querySelectorAll('button')).filter(function (entry) { return entry.textContent === name; })[0];
          if (selected) selected.focus();
        });
      });
      subcategoryRow.appendChild(button);
    });
    renderWatchFilters();
  }

  function renderWatchFilters() {
    watchFilterRow.innerHTML = '';
    var filters = state.section === 'Watch' && state.subcategory !== 'All'
      ? watchBrowseApi.getFilters(state.subcategory)
      : [];
    watchFilterRow.hidden = !filters.length;
    filters.forEach(function (filter) {
      var button = document.createElement('button');
      var active = filter.id === state.watchFilter;
      button.type = 'button';
      button.className = 'focusable' + (active ? ' active' : '');
      button.setAttribute('aria-pressed', String(active));
      button.textContent = filter.label;
      button.addEventListener('click', function () {
        state.watchFilter = filter.id; state.query = ''; state.page = 1;
        loadItems(false).then(function () {
          var selected = watchFilterRow.querySelector('.active');
          if (selected) selected.focus();
        });
      });
      watchFilterRow.appendChild(button);
    });
    renderLiveFilters();
  }

  function replaceLiveOptions(select, label, entries, selected) {
    select.innerHTML = '';
    var all = document.createElement('option'); all.value = ''; all.textContent = label; select.appendChild(all);
    entries.forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry.code || '';
      option.textContent = [entry.flag || '', entry.name || entry.code].filter(Boolean).join(' ');
      select.appendChild(option);
    });
    select.value = selected;
  }

  function renderLiveFilters() {
    var visible = state.section === 'Watch' && (state.subcategory === 'Sports' || state.subcategory === 'Live TV');
    liveFilterRow.hidden = !visible;
    if (!visible) return;
    replaceLiveOptions(liveCountrySelect, 'All countries', state.liveFacets.countries || [], state.liveCountry);
    replaceLiveOptions(liveLanguageSelect, 'All languages', state.liveFacets.languages || [], state.liveLanguage);
    liveDirectoryStatus.textContent = state.loading
      ? 'Checking IPTV-org and Harbor stream health…'
      : Math.max(state.liveTotal, state.items.length) + ' compatible channels' + (state.liveCached ? ' · cached directory' : ' · unsafe and unsupported streams removed');
  }

  function renderHero() {
    state.active = state.items[0] || null;
    if (!state.active) {
      heroKicker.textContent = state.query ? 'No matches' : 'Nothing here yet';
      heroTitle.textContent = state.query ? 'No results for “' + state.query + '”' : 'Try another category';
      heroSummary.textContent = state.query ? 'Check the spelling or search a different title.' : 'Harbor will show available titles here.';
      hero.style.backgroundImage = '';
      heroPlay.hidden = true;
      heroSave.hidden = true;
      return;
    }
    heroPlay.hidden = false;
    heroSave.hidden = false;
    heroKicker.textContent = state.active.category === 'Watch' ? 'Tonight on Harbor' : state.active.category || 'Harbor';
    heroTitle.textContent = state.active.name;
    heroSummary.textContent = state.active.summary || 'Open this in Harbor.';
    if (state.active.image) hero.style.backgroundImage = 'linear-gradient(90deg, #08040f 0%, rgba(8,4,15,.86) 43%, rgba(8,4,15,.12) 78%), linear-gradient(transparent 60%, #050208), url("' + state.active.image.replace(/"/g, '') + '")';
    else hero.style.backgroundImage = '';
    updateSaveButtons();
  }

  function renderCards() {
    cardGrid.innerHTML = '';
    state.items.forEach(function (item) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'media-card focusable' + (isSaved(item) ? ' saved' : '');
      card.setAttribute('aria-pressed', String(isSaved(item)));
      card.setAttribute('aria-label', item.name + ' · ' + (item.meta || item.category));
      var art = document.createElement('span');
      art.className = 'media-art';
      var artFallback = document.createElement('span');
      artFallback.className = 'media-art-fallback';
      artFallback.textContent = String(item.name || 'H').charAt(0).toUpperCase();
      art.appendChild(artFallback);
      if (item.image) {
        var image = document.createElement('img');
        image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
        image.addEventListener('load', function () { artFallback.hidden = true; }, { once: true });
        image.addEventListener('error', function () { artFallback.hidden = false; if (image.parentNode) image.parentNode.removeChild(image); }, { once: true });
        image.src = item.image;
        art.appendChild(image);
      }
      var badge = document.createElement('span'); badge.textContent = item.type || item.category; art.appendChild(badge);
      var title = document.createElement('h3'); title.textContent = item.name;
      var meta = document.createElement('p'); meta.textContent = item.meta || item.category;
      card.appendChild(art); card.appendChild(title); card.appendChild(meta);
      card.addEventListener('click', function () { openDetail(item); });
      cardGrid.appendChild(card);
    });
    if (!state.items.length) cardGrid.innerHTML = '<div class="empty-state"><h3>No titles found</h3><p>Try a different search or category.</p></div>';
    var isLive = state.subcategory === 'Sports' || state.subcategory === 'Live TV';
    resultCount.textContent = isLive
      ? state.items.length + ' of ' + Math.max(state.liveTotal, state.items.length) + ' compatible channels'
      : state.items.length + (state.items.length === 1 ? ' title' : ' titles');
    renderLiveFilters();
    moreButton.hidden = !state.canLoadMore;
  }

  function loadItems(append) {
    var generation = ++itemLoadGeneration;
    state.loading = true;
    moreButton.disabled = true;
    if (!append) { state.items = []; cardGrid.innerHTML = '<p role="status">Loading Harbor…</p>'; renderSubcategories(); }
    var browseFilter = state.section === 'Watch' ? watchBrowseApi.getFilter(state.subcategory, state.watchFilter) : null;
    rowKicker.textContent = state.query ? state.section + ' search' : state.subcategory;
    rowTitle.textContent = state.query ? 'Results for “' + state.query + '”' : state.section === 'Home' ? state.subcategory : browseFilter ? browseFilter.label + ' ' + state.subcategory : 'Browse ' + state.subcategory;
    return fetchCurrent(state.query, state.page).then(function (items) {
      if (generation !== itemLoadGeneration) return;
      var next = items.filter(function (item) { return item && item.name; });
      state.items = append ? state.items.concat(next.filter(function (item) { return !state.items.some(function (existing) { return existing.id === item.id; }); })) : next;
      state.canLoadMore = next.length >= 20 && !['Play', 'Sports', 'Live TV', 'My List', 'Continue'].includes(state.subcategory);
      state.loading = false; moreButton.disabled = false; renderHero(); renderCards();
    }).catch(function () {
      if (generation !== itemLoadGeneration) return;
      if (state.query) state.items = [];
      else if (state.section === 'Home' && state.subcategory === 'My List') state.items = state.saved;
      else if (state.section === 'Home' && state.subcategory === 'Continue') state.items = state.history;
      else state.items = fallbackWatch.concat(liveItems).filter(function (item) { return matchesWatchSubcategory(item) && matchesWatchFilter(item); });
      state.loading = false; moreButton.disabled = false; state.canLoadMore = false; renderHero(); renderCards(); notify(state.query ? 'Search is unavailable right now.' : 'Harbor is offline. Showing saved picks.');
    });
  }

  function setSection(section) {
    state.section = section;
    state.subcategory = 'All'; state.watchFilter = ''; state.liveCountry = ''; state.liveLanguage = ''; state.liveFacets = { countries: [], languages: [], sports: [] }; state.liveTotal = 0; state.liveCached = false; state.query = ''; state.page = 1;
    document.querySelectorAll('[data-section]').forEach(function (button) {
      var active = button.getAttribute('data-section') === section;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    loadItems(false).then(function () {
      if (state.section !== section) return;
      var activeNav = document.querySelector('[data-section="' + section + '"]') || document.querySelector('[data-action="watch"]');
      if (activeNav) activeNav.focus();
      window.scrollTo(0, 0);
    });
  }

  function normalizeQuery(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function itemMatchesQuery(item, query) {
    var needle = normalizeQuery(query);
    if (!needle) return true;
    var text = normalizeQuery([item.name, item.meta, item.section, (item.tags || []).join(' '), item.type].join(' '));
    if (needle.length >= 3 && text.indexOf(needle) >= 0) return true;
    var words = text.split(' ');
    return needle.split(' ').every(function (token) { return words.indexOf(token) >= 0; });
  }

  function fetchSeriesMetadata(item) {
    var key = String(item && item.tmdbId || '');
    if (seriesMetadataCache[key]) return Promise.resolve(seriesMetadataCache[key]);
    var offline = seriesMetadataApi.normalizeSeriesSeasons(offlineSeriesMetadata[key] || null, 0);
    if (!TMDB_KEY || !key) return Promise.resolve(offline);
    return requestJson('https://api.themoviedb.org/3/tv/' + encodeURIComponent(key) + '?api_key=' + TMDB_KEY).then(function (data) {
      var seasons = seriesMetadataApi.normalizeSeriesSeasons(data, 0);
      seriesMetadataCache[key] = seasons.length ? seasons : offline;
      return seriesMetadataCache[key];
    }).catch(function () { return offline; });
  }

  function renderEpisodeBrowser() {
    seasonSelect.innerHTML = '';
    state.seasons.forEach(function (season) {
      var option = document.createElement('option');
      option.value = season.number;
      option.textContent = season.name + ' · ' + season.episodeCount + (season.episodeCount === 1 ? ' episode' : ' episodes');
      seasonSelect.appendChild(option);
    });

    if (!state.seasons.length) {
      episodeCaption.textContent = 'Episode information is unavailable.';
      episodeGrid.innerHTML = '';
      seasonSelect.disabled = true;
      episodePrevious.hidden = true;
      episodeNext.hidden = true;
      return;
    }

    var selection = seriesMetadataApi.clampSelection(state.seasons, state.season, state.episode);
    state.season = selection.season;
    state.episode = selection.episode;
    seasonSelect.value = String(state.season);
    seasonSelect.disabled = false;
    var current = seriesMetadataApi.findSeason(state.seasons, state.season);
    var pageCount = Math.ceil(current.episodeCount / EPISODE_PAGE_SIZE);
    state.episodePage = Math.max(0, Math.min(pageCount - 1, state.episodePage));
    var pageStart = state.episodePage * EPISODE_PAGE_SIZE + 1;
    var pageEnd = Math.min(current.episodeCount, pageStart + EPISODE_PAGE_SIZE - 1);
    episodeCaption.textContent = current.name + ' · ' + current.episodeCount + (current.episodeCount === 1 ? ' episode' : ' episodes') + (pageCount > 1 ? ' · Showing ' + pageStart + '–' + pageEnd : '');
    episodeGrid.innerHTML = '';
    for (var episode = pageStart; episode <= pageEnd; episode += 1) {
      (function (episodeNumber) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'episode-button focusable' + (episodeNumber === state.episode ? ' active' : '');
        button.textContent = 'Episode ' + episodeNumber;
        button.setAttribute('aria-pressed', String(episodeNumber === state.episode));
        button.addEventListener('click', function () {
          state.episode = episodeNumber;
          Array.prototype.slice.call(episodeGrid.querySelectorAll('.episode-button')).forEach(function (entry) {
            var selected = entry === button;
            entry.classList.toggle('active', selected);
            entry.setAttribute('aria-pressed', String(selected));
          });
          openPlayer(state.active);
        });
        episodeGrid.appendChild(button);
      }(episode));
    }
    episodePrevious.hidden = state.episodePage === 0;
    episodeNext.hidden = state.episodePage >= pageCount - 1;
  }

  function formatGuideClock(value) {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  }

  function loadLiveGuide(item) {
    var generation = ++liveGuideGeneration;
    detailGuideList.innerHTML = '';
    detailGuideStatus.textContent = 'Checking IPTV-org programme sources…';
    watchBrowseApi.loadLiveGuide(item.channelId, item.feedId, { limit: 5 }).then(function (guide) {
      if (generation !== liveGuideGeneration || !state.active || state.active.id !== item.id || detailPanel.hidden) return;
      if (!guide.programmes || !guide.programmes.length) {
        detailGuideStatus.textContent = 'A current schedule is not published for this channel. Live playback is still available.';
        return;
      }
      detailGuideStatus.textContent = [guide.provider ? 'Listings from ' + guide.provider : '', guide.language ? guide.language.toUpperCase() : ''].filter(Boolean).join(' · ');
      guide.programmes.forEach(function (programme) {
        var row = document.createElement('li');
        if (programme.current) row.className = 'current';
        var time = document.createElement('time'); time.dateTime = programme.start; time.textContent = formatGuideClock(programme.start) + '–' + formatGuideClock(programme.stop);
        var copy = document.createElement('div');
        var title = document.createElement('strong'); title.textContent = programme.title; copy.appendChild(title);
        if (programme.description) { var summary = document.createElement('p'); summary.textContent = programme.description; copy.appendChild(summary); }
        row.appendChild(time); row.appendChild(copy); detailGuideList.appendChild(row);
      });
    });
  }

  function openDetail(item) {
    focusBeforeOverlay = document.activeElement;
    state.active = item;
    state.seasons = [];
    state.season = Number(item.resume && item.resume.season) || 1;
    state.episode = Number(item.resume && item.resume.episode) || 1;
    state.episodePage = Math.floor((state.episode - 1) / EPISODE_PAGE_SIZE);
    detailKicker.textContent = item.category + ' · ' + (item.type || 'Harbor');
    detailTitle.textContent = item.name;
    detailMeta.textContent = item.meta || '';
    detailSummary.textContent = item.summary || 'Open this title in Harbor.';
    updateSaveButtons();
    var isSeries = item.type === 'tv' || item.type === 'anime';
    var isLive = item.type === 'live';
    episodeBrowser.hidden = !isSeries;
    detailLiveGuide.hidden = !isLive;
    if (isLive) loadLiveGuide(item); else liveGuideGeneration += 1;
    detailPlay.hidden = isSeries;
    detailPlay.disabled = isSeries;
    if (isSeries) {
      seasonSelect.disabled = true;
      seasonSelect.innerHTML = '<option>Loading seasons…</option>';
      episodeCaption.textContent = 'Loading episodes…';
      episodeGrid.innerHTML = '';
      fetchSeriesMetadata(item).then(function (seasons) {
        if (!state.active || state.active.id !== item.id || detailPanel.hidden) return;
        state.seasons = seasons;
        renderEpisodeBrowser();
        if (document.activeElement === detailSave) setTimeout(focusDetailPrimary, 0);
      });
    }
    detailPanel.hidden = false;
    syncOverlayAccessibility();
    setTimeout(focusDetailPrimary, 0);
  }

  function focusDetailPrimary() {
    if (detailPanel.hidden || !state.active) return;
    var isSeries = state.active.type === 'tv' || state.active.type === 'anime';
    var target = isSeries
      ? episodeGrid.querySelector('.episode-button.active') || (!seasonSelect.disabled ? seasonSelect : detailSave)
      : detailPlay;
    if (target && !target.disabled && !target.hidden) target.focus();
  }

  function addHistory(item) {
    var resume = (item.type === 'tv' || item.type === 'anime') ? { season: state.season, episode: state.episode } : null;
    state.history = [snapshot(item, resume)].concat(state.history.filter(function (entry) { return entry.id !== item.id; })).slice(0, 60);
    persist();
  }

  function streamRoutes(item, season, episode) {
    var isTv = item.type === 'tv' || item.type === 'anime';
    if (!item.tmdbId) return [];
    var vidLinkPath = isTv
      ? 'tv/' + item.tmdbId + '/' + season + '/' + episode
      : 'movie/' + item.tmdbId;
    var vidSrcPath = isTv
      ? 'tv/' + item.tmdbId + '/' + season + '/' + episode
      : 'movie/' + item.tmdbId;
    return [
      {
        provider: 'vidlink',
        url: 'https://vidlink.pro/' + vidLinkPath + '?primaryColor=9a6dff&secondaryColor=1a1026&iconColor=f7f3ff&icons=default&title=false&poster=true&autoplay=true&nextbutton=false'
      },
      {
        provider: 'vidsrc',
        url: 'https://vidsrc.to/embed/' + vidSrcPath
      }
    ];
  }

  function showPlayerStatus(title, detail, failed) {
    playerStatusTitle.textContent = title;
    playerStatusDetail.textContent = detail;
    playerStatus.classList.toggle('failed', Boolean(failed));
    playerRetry.hidden = !failed;
    playerStatus.hidden = false;
  }

  function focusPlayerFrame() {
    if (playerPanel.hidden || tvFrame.hidden || (state.playerMode !== 'embed' && state.playerMode !== 'page')) return;
    try {
      tvFrame.focus();
      if (tvFrame.contentWindow && typeof tvFrame.contentWindow.focus === 'function') tvFrame.contentWindow.focus();
    } catch (_) {}
  }

  function revealPlayerControls(route) {
    clearTimeout(playerControlTimer);
    playerControlTimer = setTimeout(function () {
      if (playerPanel.hidden || tvFrame.hidden || state.playerRoutes[state.playerRouteIndex] !== route) return;
      playerStatus.hidden = true;
      focusPlayerFrame();
    }, 900);
  }

  function markPlayerReady() {
    if (playerReady || playerPanel.hidden) return;
    playerReady = true;
    clearTimeout(playerRouteTimer);
    clearTimeout(playerReadyTimer);
    clearTimeout(playerControlTimer);
    if (state.active && state.active.type === 'live' && liveStreamCandidates[liveStreamIndex] && liveStreamCandidates[liveStreamIndex].url) {
      watchBrowseApi.markLiveStreamSuccess(liveStreamCandidates[liveStreamIndex].url, localStorage);
    }
    playerReadyTimer = setTimeout(function () {
      playerStatus.hidden = true;
      if (state.playerMode === 'video' && !tvVideo.hidden) tvVideo.focus();
      else focusPlayerFrame();
    }, 900);
  }

  function loadPlayerRoute() {
    clearTimeout(playerRouteTimer);
    clearTimeout(playerReadyTimer);
    clearTimeout(playerControlTimer);
    if (!state.playerRoutes.length || state.playerRouteIndex >= state.playerRoutes.length) {
      tvFrame.src = 'about:blank';
      tvFrame.hidden = true;
      showPlayerStatus("We couldn't play this title", 'The secure playback providers did not start. Try again in a moment or watch on your computer.', true);
      playerRetry.focus();
      return;
    }
    var route = state.playerRoutes[state.playerRouteIndex];
    playerReady = false;
    showPlayerStatus('Getting ' + playerTitle.textContent + ' ready', 'Player controls will take over automatically.', false);
    tvFrame.hidden = false;
    tvFrame.src = route.url;
    playerRouteTimer = setTimeout(function () {
      state.playerRouteIndex += 1;
      loadPlayerRoute();
    }, 18000);
  }

  function destroyPlayerHls() {
    if (!playerHls) return;
    playerHls.destroy();
    playerHls = null;
  }

  function currentLiveStream() {
    return liveStreamCandidates[liveStreamIndex] || null;
  }

  function tryNextLiveStream() {
    clearTimeout(playerRouteTimer);
    var failed = currentLiveStream();
    if (failed && failed.url) watchBrowseApi.markLiveStreamFailure(failed.url, localStorage);
    liveStreamIndex += 1;
    liveStreamRecoveryAttempts = 0;
    if (liveStreamIndex >= liveStreamCandidates.length) {
      showPlayerStatus('Unable to play right now', 'Harbor tried every compatible stream published for this channel. Try again later or choose another channel.', true);
      playerRetry.focus();
      return;
    }
    showPlayerStatus(state.active.name, 'That feed did not respond. Trying another public stream…', false);
    setTimeout(loadLivePlayerStream, 180);
  }

  function loadLivePlayerStream() {
    var stream = currentLiveStream();
    if (!stream || !stream.url) { tryNextLiveStream(); return; }
    clearTimeout(playerRouteTimer);
    destroyPlayerHls();
    playerReady = false;
    tvVideo.pause();
    tvVideo.removeAttribute('src');
    tvVideo.hidden = false;
    showPlayerStatus(state.active.name, 'Connecting to the public live feed…', false);
    if (/\.m3u8(?:$|[?#])/i.test(stream.url) && window.Hls && window.Hls.isSupported()) {
      playerHls = new window.Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 60 });
      playerHls.attachMedia(tvVideo);
      playerHls.on(window.Hls.Events.MEDIA_ATTACHED, function () { if (playerHls) playerHls.loadSource(stream.url); });
      playerHls.on(window.Hls.Events.MANIFEST_PARSED, function () { tvVideo.play().catch(function () {}); });
      playerHls.on(window.Hls.Events.ERROR, function (_event, data) {
        if (!data || !data.fatal) return;
        if (liveStreamRecoveryAttempts < 1 && data.type === window.Hls.ErrorTypes.NETWORK_ERROR && playerHls) {
          liveStreamRecoveryAttempts += 1; playerHls.startLoad();
        } else if (liveStreamRecoveryAttempts < 1 && data.type === window.Hls.ErrorTypes.MEDIA_ERROR && playerHls) {
          liveStreamRecoveryAttempts += 1; playerHls.recoverMediaError();
        } else tryNextLiveStream();
      });
    } else {
      tvVideo.src = stream.url;
      tvVideo.play().catch(function () {});
    }
    playerRouteTimer = setTimeout(tryNextLiveStream, 15000);
  }

  function resetPlayer() {
    clearTimeout(playerRouteTimer);
    clearTimeout(playerReadyTimer);
    clearTimeout(playerControlTimer);
    state.playerRoutes = [];
    state.playerRouteIndex = 0;
    state.playerMode = '';
    liveStreamCandidates = [];
    liveStreamIndex = 0;
    liveStreamRecoveryAttempts = 0;
    playerReady = false;
    destroyPlayerHls();
    tvFrame.hidden = true; tvFrame.src = 'about:blank';
    tvVideo.pause(); tvVideo.hidden = true; tvVideo.removeAttribute('src');
    tvAudio.pause(); tvAudio.hidden = true; tvAudio.removeAttribute('src');
    showPlayerStatus('Getting it ready…', 'One moment.', false);
  }

  function openPlayer(item) {
    if (!item) return;
    addHistory(item); resetPlayer(); detailPanel.hidden = true; playerPanel.hidden = false; playerTitle.textContent = item.name; syncOverlayAccessibility();
    var isSeries = item.type === 'tv' || item.type === 'anime';
    var season = seriesMetadataApi.findSeason(state.seasons, state.season);
    playerEpisodeLabel.textContent = isSeries ? (season ? season.name : 'Season ' + state.season) + ' · Episode ' + state.episode : '';
    showPlayerStatus(item.name, isSeries ? playerEpisodeLabel.textContent : 'Getting your movie ready…', false);
    setTimeout(function () { playerBack.focus(); }, 0);
    if (item.directStream) {
      state.playerMode = 'video';
      liveStreamCandidates = item.type === 'live' && item.streamCandidates && item.streamCandidates.length
        ? item.streamCandidates.slice(0, 4)
        : [{ url: item.directStream, type: /\.m3u8(?:$|[?#])/i.test(item.directStream) ? 'hls' : 'video', quality: '', label: '' }];
      liveStreamIndex = 0;
      liveStreamRecoveryAttempts = 0;
      loadLivePlayerStream();
      return;
    }
    if (item.preview) {
      state.playerMode = 'audio';
      tvAudio.src = item.preview; tvAudio.hidden = false;
      playerRouteTimer = setTimeout(function () { showPlayerStatus('Unable to play right now', 'This preview did not respond.', true); }, 12000);
      return;
    }
    state.playerRoutes = streamRoutes(item, state.season, state.episode);
    state.playerRouteIndex = 0;
    if (state.playerRoutes.length) { state.playerMode = 'embed'; loadPlayerRoute(); return; }
    if (item.url) { state.playerMode = 'page'; state.playerRoutes = [{ provider: 'page', url: item.url }]; loadPlayerRoute(); return; }
    showPlayerStatus('This title is unavailable', 'Try another title or category.', true);
  }

  function closeLayer(name) {
    if (name === 'search') searchPanel.hidden = true;
    if (name === 'detail') { liveGuideGeneration += 1; detailPanel.hidden = true; }
    if (name === 'player') {
      resetPlayer(); playerPanel.hidden = true;
      if (state.active) {
        detailPanel.hidden = false;
        syncOverlayAccessibility();
        setTimeout(focusDetailPrimary, 0);
        return;
      }
    }
    syncOverlayAccessibility();
    if (focusBeforeOverlay && typeof focusBeforeOverlay.focus === 'function' && document.documentElement.contains(focusBeforeOverlay)) setTimeout(function () { focusBeforeOverlay.focus(); }, 0);
  }

  function visibleFocusables() {
    var root = !playerPanel.hidden ? playerPanel : !detailPanel.hidden ? detailPanel : !searchPanel.hidden ? searchPanel : document;
    return Array.prototype.slice.call(root.querySelectorAll('.focusable:not([disabled])')).filter(function (element) {
      var rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  function matchesWatchSubcategory(item) {
    return state.subcategory === 'All'
      || (state.subcategory === 'Movies' && item.type === 'movie')
      || (state.subcategory === 'TV Shows' && item.type === 'tv')
      || (state.subcategory === 'Anime' && item.type === 'anime')
      || (state.subcategory === 'Sports' && item.section === 'Sports')
      || (state.subcategory === 'Live TV' && item.section === 'Live TV');
  }

  function matchesWatchFilter(item) {
    if (!state.watchFilter) return true;
    return watchBrowseApi.matchesLocalFilter({
      name: item.name,
      summary: item.summary,
      meta: item.meta,
      section: item.section,
      sections: [item.section].concat(item.tags || [])
    }, state.subcategory, state.watchFilter);
  }

  function revealFocused(element) {
    var horizontal = element.parentElement;
    if (horizontal && (horizontal.classList.contains('subcategory-row') || horizontal.classList.contains('watch-filter-row') || horizontal.classList.contains('tv-nav'))) {
      var itemLeft = element.offsetLeft;
      var itemRight = itemLeft + element.offsetWidth;
      if (itemLeft < horizontal.scrollLeft) horizontal.scrollLeft = Math.max(0, itemLeft - 24);
      if (itemRight > horizontal.scrollLeft + horizontal.clientWidth) horizontal.scrollLeft = itemRight - horizontal.clientWidth + 24;
    }
    if (horizontal && horizontal.classList.contains('episode-grid')) {
      if (element.offsetTop < horizontal.scrollTop) horizontal.scrollTop = Math.max(0, element.offsetTop - 12);
      else if (element.offsetTop + element.offsetHeight > horizontal.scrollTop + horizontal.clientHeight) horizontal.scrollTop = element.offsetTop + element.offsetHeight - horizontal.clientHeight + 12;
    }

    var rect = element.getBoundingClientRect();
    var topBoundary = 118;
    var bottomBoundary = window.innerHeight - 90;
    if (rect.top < topBoundary) window.scrollBy(0, rect.top - topBoundary - 24);
    else if (rect.bottom > bottomBoundary) window.scrollBy(0, rect.bottom - bottomBoundary + 24);
  }

  function semanticFocusTarget(current, direction) {
    if (!playerPanel.hidden) return null;
    if (!searchPanel.hidden) {
      if (current === searchInput && (direction === 'right' || direction === 'down')) return searchSubmit;
      if (current === searchSubmit && direction === 'left') return searchInput;
      if (current === searchSubmit && direction === 'down') return searchBack;
      if (current === searchBack && direction === 'up') return searchSubmit;
    }
    if (direction === 'down' && (current.closest('.tv-header-actions') || current.closest('.tv-nav') || current.classList.contains('tv-brand'))) return heroPlay.hidden ? subcategoryRow.querySelector('.focusable') : heroPlay;
    if (direction === 'down' && current.closest('.hero-actions')) return subcategoryRow.querySelector('.focusable');
    if (direction === 'down' && current.parentElement === subcategoryRow) return watchFilterRow.hidden ? cardGrid.querySelector('.media-card') : watchFilterRow.querySelector('.active') || watchFilterRow.querySelector('.focusable');
    if (direction === 'down' && current.parentElement === watchFilterRow) return liveFilterRow.hidden ? cardGrid.querySelector('.media-card') : liveCountrySelect;
    if (direction === 'down' && current === liveFilterDone) return cardGrid.querySelector('.media-card');
    if (direction === 'up' && current.classList.contains('media-card')) return !liveFilterRow.hidden ? liveFilterDone : watchFilterRow.hidden ? subcategoryRow.querySelector('.active') || subcategoryRow.querySelector('.focusable') : watchFilterRow.querySelector('.active') || watchFilterRow.querySelector('.focusable');
    if (direction === 'up' && current.closest('.live-filter-row')) return watchFilterRow.querySelector('.active') || watchFilterRow.querySelector('.focusable');
    if (direction === 'up' && current.parentElement === watchFilterRow) return subcategoryRow.querySelector('.active') || subcategoryRow.querySelector('.focusable');
    if (direction === 'up' && current.parentElement === subcategoryRow) return heroPlay.hidden ? document.querySelector('[data-action="watch"]') : heroPlay;
    return null;
  }

  function moveFocus(direction) {
    var current = document.activeElement;
    var candidates = visibleFocusables();
    if (!current || candidates.indexOf(current) === -1) {
      if (candidates[0]) { candidates[0].focus(); revealFocused(candidates[0]); }
      return;
    }
    var semantic = semanticFocusTarget(current, direction);
    if (semantic) { semantic.focus(); revealFocused(semantic); return; }
    var from = current.getBoundingClientRect(); var fx = from.left + from.width / 2; var fy = from.top + from.height / 2;
    var best = null; var bestScore = Infinity;
    candidates.forEach(function (candidate) {
      if (candidate === current) return;
      var rect = candidate.getBoundingClientRect(); var x = rect.left + rect.width / 2; var y = rect.top + rect.height / 2; var dx = x - fx; var dy = y - fy;
      if ((direction === 'left' && dx >= -4) || (direction === 'right' && dx <= 4) || (direction === 'up' && dy >= -4) || (direction === 'down' && dy <= 4)) return;
      var horizontal = direction === 'left' || direction === 'right';
      var primary = horizontal ? Math.abs(dx) : Math.abs(dy);
      var secondary = horizontal ? Math.abs(dy) : Math.abs(dx);
      var alignment = horizontal ? Math.min(from.bottom, rect.bottom) - Math.max(from.top, rect.top) : Math.min(from.right, rect.right) - Math.max(from.left, rect.left);
      var score = primary + secondary * (alignment > 0 ? 3.6 : 5.4);
      if (score < bestScore) { bestScore = score; best = candidate; }
    });
    if (best) { best.focus(); revealFocused(best); }
  }

  function directionForEvent(event) {
    var key = event.key;
    var code = event.keyCode || event.which;
    if (key === 'ArrowLeft' || key === 'Left' || code === 37) return 'left';
    if (key === 'ArrowUp' || key === 'Up' || code === 38) return 'up';
    if (key === 'ArrowRight' || key === 'Right' || code === 39) return 'right';
    if (key === 'ArrowDown' || key === 'Down' || code === 40) return 'down';
    return '';
  }

  document.querySelectorAll('[data-section]').forEach(function (button) { button.addEventListener('click', function () { setSection(button.getAttribute('data-section')); }); });
  document.querySelector('[data-action="watch"]').addEventListener('click', function (event) { event.preventDefault(); setSection('Watch'); });
  document.getElementById('search-button').addEventListener('click', function () { focusBeforeOverlay = document.activeElement; searchPanel.hidden = false; syncOverlayAccessibility(); searchInput.value = state.query; searchInput.placeholder = 'Search ' + (state.subcategory === 'All' ? state.section : state.subcategory); setTimeout(function () { searchInput.focus(); searchInput.select(); }, 0); });
  document.getElementById('list-button').addEventListener('click', function () { state.section = 'Home'; state.subcategory = 'My List'; state.watchFilter = ''; state.liveCountry = ''; state.liveLanguage = ''; state.query = ''; state.page = 1; loadItems(false); });
  liveCountrySelect.addEventListener('change', function () { state.liveCountry = liveCountrySelect.value; state.page = 1; loadItems(false).then(function () { liveCountrySelect.focus(); }); });
  liveLanguageSelect.addEventListener('change', function () { state.liveLanguage = liveLanguageSelect.value; state.page = 1; loadItems(false).then(function () { liveLanguageSelect.focus(); }); });
  liveFilterDone.addEventListener('click', function () { var card = cardGrid.querySelector('.media-card'); if (card) { card.focus(); revealFocused(card); } });
  searchForm.addEventListener('submit', function (event) {
    event.preventDefault(); state.query = searchInput.value.trim(); state.page = 1; searchPanel.hidden = true; syncOverlayAccessibility();
    loadItems(false).then(function () {
      var target = cardGrid.querySelector('.media-card') || subcategoryRow.querySelector('.active');
      if (target) target.focus();
    });
  });
  heroPlay.addEventListener('click', function () { openDetail(state.active); });
  detailPlay.addEventListener('click', function () { openPlayer(state.active); });
  seasonSelect.addEventListener('change', function () { state.season = parseInt(seasonSelect.value, 10) || 1; state.episode = 1; state.episodePage = 0; renderEpisodeBrowser(); });
  episodePrevious.addEventListener('click', function () { state.episodePage = Math.max(0, state.episodePage - 1); renderEpisodeBrowser(); var target = episodeGrid.querySelector('.episode-button'); if (target) target.focus(); });
  episodeNext.addEventListener('click', function () { state.episodePage += 1; renderEpisodeBrowser(); var target = episodeGrid.querySelector('.episode-button'); if (target) target.focus(); });
  heroSave.addEventListener('click', function () { toggleSaved(state.active); });
  detailSave.addEventListener('click', function () { toggleSaved(state.active); });
  moreButton.addEventListener('click', function () { if (state.loading) return; state.page += 1; loadItems(true); });
  playerRetry.addEventListener('click', function () {
    if (state.active && state.active.type === 'live' && liveStreamCandidates.length) {
      liveStreamIndex = 0; liveStreamRecoveryAttempts = 0; loadLivePlayerStream(); return;
    }
    state.playerRouteIndex = 0; if (state.playerRoutes.length) loadPlayerRoute(); else openPlayer(state.active);
  });
  document.querySelectorAll('[data-close]').forEach(function (button) { button.addEventListener('click', function () { closeLayer(button.getAttribute('data-close')); }); });
  tvFrame.addEventListener('load', function () {
    if (playerPanel.hidden || tvFrame.src === 'about:blank') return;
    var route = state.playerRoutes[state.playerRouteIndex];
    if (route) revealPlayerControls(route);
    if (state.playerMode === 'page') {
      markPlayerReady();
      return;
    }
    if (state.playerMode === 'embed' && route && route.provider !== 'vidlink') {
      clearTimeout(playerReadyTimer);
      playerReadyTimer = setTimeout(function () {
        if (!playerPanel.hidden && !playerReady && state.playerRoutes[state.playerRouteIndex] === route) markPlayerReady();
      }, 1200);
    }
  });
  tvFrame.addEventListener('focus', function () {
    try {
      if (tvFrame.contentWindow && typeof tvFrame.contentWindow.focus === 'function') tvFrame.contentWindow.focus();
    } catch (_) {}
  });
  window.addEventListener('message', function (event) {
    if (event.origin !== 'https://vidlink.pro' || event.source !== tvFrame.contentWindow || playerPanel.hidden || !event.data) return;
    var playerEvent = event.data.type === 'PLAYER_EVENT' && event.data.data && event.data.data.event;
    if (playerEvent === 'play' || playerEvent === 'timeupdate') markPlayerReady();
  });
  tvVideo.addEventListener('canplay', function () { markPlayerReady(); });
  tvAudio.addEventListener('canplay', function () { markPlayerReady(); });
  tvVideo.addEventListener('error', function () { if (state.active && state.active.type === 'live') tryNextLiveStream(); else showPlayerStatus('Unable to play right now', 'The live channel could not be played.', true); });
  tvAudio.addEventListener('error', function () { showPlayerStatus('Unable to play right now', 'This preview could not be played.', true); });

  document.addEventListener('focusin', function (event) {
    if (event.target && event.target.classList && event.target.classList.contains('focusable')) event.target.classList.add('focused');
  });
  document.addEventListener('focusout', function (event) {
    if (event.target && event.target.classList) event.target.classList.remove('focused');
  });

  document.addEventListener('keydown', function (event) {
    var key = event.key;
    var code = event.keyCode;
    var direction = directionForEvent(event);
    if (key === 'Tab' && (!playerPanel.hidden || !detailPanel.hidden || !searchPanel.hidden)) {
      var tabStops = visibleFocusables();
      if (tabStops.length) {
        var tabIndex = tabStops.indexOf(document.activeElement);
        var nextIndex = event.shiftKey ? (tabIndex <= 0 ? tabStops.length - 1 : tabIndex - 1) : (tabIndex >= tabStops.length - 1 ? 0 : tabIndex + 1);
        event.preventDefault(); tabStops[nextIndex].focus();
      }
      return;
    }
    var editingSearch = document.activeElement === searchInput && direction === 'left';
    var editingSelect = [seasonSelect, liveCountrySelect, liveLanguageSelect].indexOf(document.activeElement) >= 0 && (direction === 'up' || direction === 'down');
    if (direction && !editingSearch && !editingSelect) {
      event.preventDefault();
      event.stopPropagation();
      moveFocus(direction);
      return;
    }
    if ((key === 'Enter' || key === 'OK' || code === 13) && document.activeElement === searchInput) {
      event.preventDefault();
      event.stopPropagation();
      searchForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return;
    }
    if ((key === 'Enter' || key === 'OK' || code === 13) && document.activeElement !== searchInput && document.activeElement !== seasonSelect) {
      var active = document.activeElement;
      if (active && typeof active.click === 'function' && active !== document.body && active !== tvFrame) {
        event.preventDefault();
        event.stopPropagation();
        active.click();
        return;
      }
    }
    if (key === 'Escape' || code === 461 || code === 10009 || code === 4) {
      event.preventDefault();
      if (!playerPanel.hidden) closeLayer('player'); else if (!detailPanel.hidden) closeLayer('detail'); else if (!searchPanel.hidden) closeLayer('search'); else setSection('Watch');
    }
  }, true);

  setSection('Watch');
  setTimeout(function () {
    var first = document.querySelector('[data-action="watch"]');
    if (first) { first.focus(); revealFocused(first); }
  }, 120);
}());
