(function () {
  'use strict';

  var TMDB_KEY = String(window.HARBOR_CONFIG && window.HARBOR_CONFIG.tmdbApiKey || '').trim();
  var TMDB_IMAGE = 'https://image.tmdb.org/t/p/w780';
  var STATE_KEY = 'harbor:tv-state:v1';
  var sections = {
    Home: ['All', 'Continue', 'My List'],
    Watch: ['All', 'Movies', 'TV Shows', 'Anime', 'Sports', 'Live TV'],
    Listen: ['All', 'Music', 'Soundtracks', 'Radio', 'Podcasts', 'Audiobooks'],
    Read: ['All', 'Books', 'Comics', 'Manga', 'Light Novels'],
    Play: ['All', 'Cloud Games', 'Action', 'RPG', 'Adventure', 'Strategy']
  };
  var playServices = [
    { id: 'play-xbox', name: 'Xbox Cloud Gaming', category: 'Play', type: 'game', section: 'Cloud Games', meta: 'Cloud gaming', summary: 'Play supported Xbox games from the cloud.', url: 'https://www.xbox.com/play' },
    { id: 'play-geforce', name: 'GeForce NOW', category: 'Play', type: 'game', section: 'Cloud Games', meta: 'Cloud gaming', summary: 'Stream games you own from supported PC stores.', url: 'https://play.geforcenow.com/' },
    { id: 'play-luna', name: 'Amazon Luna', category: 'Play', type: 'game', section: 'Cloud Games', meta: 'Cloud gaming', summary: 'Open Amazon Luna in the TV browser.', url: 'https://luna.amazon.com/' }
  ];
  var liveItems = [
    { id: 'live-sports', name: 'World Sports HD', category: 'Watch', type: 'live', section: 'Sports', meta: 'Live · Sports', summary: 'A live sports demo channel built for the Harbor TV player.', directStream: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
    { id: 'live-news', name: 'Global News 24/7', category: 'Watch', type: 'live', section: 'Live TV', meta: 'Live · News', summary: 'A continuous live-news demo channel.', directStream: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }
  ];
  var fallbackWatch = [
    { id: 'movie-693134', tmdbId: '693134', name: 'Dune: Part Two', category: 'Watch', type: 'movie', meta: '2024 · Movie', summary: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.' },
    { id: 'movie-157336', tmdbId: '157336', name: 'Interstellar', category: 'Watch', type: 'movie', meta: '2014 · Movie', summary: 'Explorers travel through a wormhole in space in an attempt to ensure humanity survives.' },
    { id: 'tv-1399', tmdbId: '1399', name: 'Game of Thrones', category: 'Watch', type: 'tv', meta: '2011 · Series', summary: 'Noble families fight for control over the lands of Westeros.' },
    { id: 'anime-1429', tmdbId: '1429', name: 'Attack on Titan', category: 'Watch', type: 'anime', meta: '2013 · Anime', summary: 'Humanity fights for survival against towering enemies.' }
  ];

  var state = { section: 'Home', subcategory: 'All', page: 1, items: [], active: null, saved: [], history: [], query: '', canLoadMore: false };
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
  var cardGrid = document.getElementById('card-grid');
  var rowKicker = document.getElementById('row-kicker');
  var rowTitle = document.getElementById('row-title');
  var resultCount = document.getElementById('result-count');
  var moreButton = document.getElementById('more-button');
  var searchPanel = document.getElementById('search-panel');
  var searchForm = document.getElementById('search-form');
  var searchInput = document.getElementById('search-input');
  var detailPanel = document.getElementById('detail-panel');
  var detailTitle = document.getElementById('detail-title');
  var detailKicker = document.getElementById('detail-kicker');
  var detailMeta = document.getElementById('detail-meta');
  var detailSummary = document.getElementById('detail-summary');
  var detailPlay = document.getElementById('detail-play');
  var detailSave = document.getElementById('detail-save');
  var playerPanel = document.getElementById('player-panel');
  var playerTitle = document.getElementById('player-title');
  var playerStatus = document.getElementById('player-status');
  var tvFrame = document.getElementById('tv-frame');
  var tvVideo = document.getElementById('tv-video');
  var tvAudio = document.getElementById('tv-audio');
  var toast = document.getElementById('toast');
  var toastTimer = null;

  function persist() {
    localStorage.setItem(STATE_KEY, JSON.stringify({ saved: state.saved.slice(0, 100), history: state.history.slice(0, 100) }));
  }

  function snapshot(item) {
    return { id: item.id, tmdbId: item.tmdbId || '', name: item.name, category: item.category, type: item.type, section: item.section || '', meta: item.meta || '', summary: item.summary || '', image: item.image || '', url: item.url || '', preview: item.preview || '', directStream: item.directStream || '' };
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
  }

  function requestJson(url) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 9000);
    return fetch(url, controller ? { signal: controller.signal } : {}).then(function (response) {
      if (!response.ok) throw new Error('Request failed');
      return response.json();
    }).finally(function () { clearTimeout(timer); });
  }

  function normalizeTmdb(item, type) {
    var mediaType = type || item.media_type || (item.title ? 'movie' : 'tv');
    return {
      id: mediaType + '-' + item.id,
      tmdbId: String(item.id),
      name: item.title || item.name || 'Untitled',
      category: 'Watch',
      type: mediaType,
      section: mediaType === 'movie' ? 'Movies' : 'TV Shows',
      meta: (item.release_date || item.first_air_date || '').slice(0, 4) + ' · ' + (mediaType === 'movie' ? 'Movie' : 'Series'),
      summary: item.overview || 'Open this title in Harbor.',
      image: item.backdrop_path || item.poster_path ? TMDB_IMAGE + (item.backdrop_path || item.poster_path) : ''
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
    return {
      id: 'read-' + key,
      name: item.title || 'Untitled book',
      category: 'Read',
      type: section === 'Manga' ? 'manga' : section === 'Comics' ? 'comic' : 'book',
      section: section || 'Books',
      meta: (item.first_publish_year || 'Book') + (item.author_name && item.author_name[0] ? ' · ' + item.author_name[0] : ''),
      summary: 'Explore this title through Open Library.',
      image: item.cover_i ? 'https://covers.openlibrary.org/b/id/' + item.cover_i + '-L.jpg' : '',
      url: /^\/works\//.test(key) ? 'https://openlibrary.org' + key : 'https://openlibrary.org/search?q=' + encodeURIComponent(item.title || '')
    };
  }

  function fetchWatch(query, page) {
    if (!TMDB_KEY) {
      var normalizedQuery = String(query || '').trim().toLowerCase();
      return Promise.resolve(fallbackWatch.concat(liveItems).filter(function (item) {
        var matchesQuery = !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery);
        var matchesCategory = state.subcategory === 'All'
          || (state.subcategory === 'Movies' && item.type === 'movie')
          || (state.subcategory === 'TV Shows' && item.type === 'tv')
          || (state.subcategory === 'Anime' && item.type === 'anime')
          || (state.subcategory === 'Sports' && item.section === 'Sports')
          || (state.subcategory === 'Live TV' && item.section === 'Live TV');
        return matchesQuery && matchesCategory;
      }));
    }
    var base = 'https://api.themoviedb.org/3/';
    var suffix = '?api_key=' + TMDB_KEY + '&include_adult=false&page=' + page;
    if (query) {
      return Promise.all([
        requestJson(base + 'search/movie' + suffix + '&query=' + encodeURIComponent(query)),
        requestJson(base + 'search/tv' + suffix + '&query=' + encodeURIComponent(query))
      ]).then(function (all) { return all[0].results.map(function (item) { return normalizeTmdb(item, 'movie'); }).concat(all[1].results.map(function (item) { return normalizeTmdb(item, 'tv'); })); });
    }
    if (state.subcategory === 'Sports' || state.subcategory === 'Live TV') {
      return Promise.resolve(liveItems.filter(function (item) { return state.subcategory === 'Sports' ? item.section === 'Sports' : true; }));
    }
    var endpoint = state.subcategory === 'Movies' ? 'discover/movie' : state.subcategory === 'TV Shows' || state.subcategory === 'Anime' ? 'discover/tv' : 'trending/all/week';
    var extra = state.subcategory === 'Anime' ? '&with_genres=16&with_original_language=ja' : '';
    return requestJson(base + endpoint + suffix + extra).then(function (data) { return data.results.map(function (item) { var type = state.subcategory === 'Movies' ? 'movie' : state.subcategory === 'Anime' ? 'anime' : state.subcategory === 'TV Shows' ? 'tv' : item.media_type; return normalizeTmdb(item, type); }); });
  }

  function fetchListen(query, page) {
    var term = query || (state.subcategory === 'Soundtracks' ? 'movie soundtrack' : state.subcategory === 'Podcasts' ? 'popular' : state.subcategory === 'Audiobooks' ? 'bestseller' : 'top hits');
    var media = state.subcategory === 'Podcasts' ? 'podcast&entity=podcast' : state.subcategory === 'Audiobooks' ? 'audiobook&entity=audiobook' : 'music&entity=song';
    var type = state.subcategory === 'Podcasts' ? 'podcast' : state.subcategory === 'Audiobooks' ? 'audiobook' : 'music';
    if (state.subcategory === 'Radio') {
      var radioUrl = query ? 'https://de1.api.radio-browser.info/json/stations/search?hidebroken=true&limit=30&name=' + encodeURIComponent(query) : 'https://de1.api.radio-browser.info/json/stations/topclick/30?hidebroken=true';
      return requestJson(radioUrl).then(function (items) { return items.map(function (item) { return { id: 'radio-' + item.stationuuid, name: item.name || 'Radio', category: 'Listen', type: 'radio', section: 'Radio', meta: (item.country || 'Radio') + (item.tags ? ' · ' + item.tags.split(',')[0] : ''), summary: 'Live radio in Harbor.', image: item.favicon || '', preview: item.url_resolved || item.url || '' }; }); });
    }
    return requestJson('https://itunes.apple.com/search?term=' + encodeURIComponent(term) + '&media=' + media + '&limit=30&offset=' + ((page - 1) * 30)).then(function (data) { return data.results.map(function (item) { return normalizeItunes(item, type); }); });
  }

  function fetchRead(query, page) {
    var term = query || (state.subcategory === 'Manga' ? 'manga' : state.subcategory === 'Comics' ? 'graphic novels' : state.subcategory === 'Light Novels' ? 'light novel' : 'bestsellers');
    return requestJson('https://openlibrary.org/search.json?q=' + encodeURIComponent(term) + '&page=' + page + '&limit=30&fields=key,title,author_name,first_publish_year,cover_i').then(function (data) { return data.docs.map(function (item) { return normalizeBook(item, state.subcategory === 'All' ? 'Books' : state.subcategory); }); });
  }

  function fetchCurrent(query, page) {
    if (state.section === 'Home') {
      if (state.subcategory === 'My List') return Promise.resolve(state.saved);
      if (state.subcategory === 'Continue') return Promise.resolve(state.history);
      if (query) return Promise.all([fetchWatch(query, page), fetchListen(query, page), fetchRead(query, page)]).then(function (all) { return all[0].concat(all[1], all[2]); });
      return fetchWatch('', page);
    }
    if (state.section === 'Watch') return fetchWatch(query, page);
    if (state.section === 'Listen') return fetchListen(query, page);
    if (state.section === 'Read') return fetchRead(query, page);
    return Promise.resolve(playServices.filter(function (item) { return (!query || item.name.toLowerCase().includes(query.toLowerCase())) && (state.subcategory === 'All' || state.subcategory === item.section); }));
  }

  function renderSubcategories() {
    subcategoryRow.innerHTML = '';
    (sections[state.section] || ['All']).forEach(function (name) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'focusable' + (name === state.subcategory ? ' active' : '');
      button.textContent = name;
      button.addEventListener('click', function () { state.subcategory = name; state.query = ''; state.page = 1; loadItems(false); });
      subcategoryRow.appendChild(button);
    });
  }

  function renderHero() {
    state.active = state.items[0] || fallbackWatch[0];
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
      var art = document.createElement('span');
      art.className = 'media-art';
      if (item.image) { var image = document.createElement('img'); image.src = item.image; image.alt = ''; image.loading = 'lazy'; art.appendChild(image); }
      var badge = document.createElement('span'); badge.textContent = item.type || item.category; art.appendChild(badge);
      var title = document.createElement('h3'); title.textContent = item.name;
      var meta = document.createElement('p'); meta.textContent = item.meta || item.category;
      card.appendChild(art); card.appendChild(title); card.appendChild(meta);
      card.addEventListener('click', function () { openDetail(item); });
      cardGrid.appendChild(card);
    });
    resultCount.textContent = state.items.length + (state.items.length === 1 ? ' title' : ' titles');
    moreButton.hidden = !state.canLoadMore;
  }

  function loadItems(append) {
    if (!append) { state.items = []; cardGrid.innerHTML = '<p>Loading Harbor…</p>'; renderSubcategories(); }
    rowKicker.textContent = state.query ? state.section + ' search' : state.subcategory;
    rowTitle.textContent = state.query ? 'Results for “' + state.query + '”' : state.section === 'Home' ? 'Popular right now' : 'Browse ' + state.subcategory;
    return fetchCurrent(state.query, state.page).then(function (items) {
      var next = items.filter(function (item) { return item && item.name; });
      state.items = append ? state.items.concat(next.filter(function (item) { return !state.items.some(function (existing) { return existing.id === item.id; }); })) : next;
      state.canLoadMore = next.length >= 20 && !['Play', 'Sports', 'Live TV', 'My List', 'Continue'].includes(state.subcategory);
      if (!state.items.length && state.section === 'Watch') state.items = fallbackWatch;
      renderHero(); renderCards();
    }).catch(function () {
      state.items = state.section === 'Watch' || state.section === 'Home' ? fallbackWatch.concat(liveItems) : state.section === 'Play' ? playServices : state.saved;
      state.canLoadMore = false; renderHero(); renderCards(); notify('Harbor is offline. Showing saved picks.');
    });
  }

  function setSection(section) {
    state.section = section;
    state.subcategory = 'All'; state.query = ''; state.page = 1;
    document.querySelectorAll('[data-section]').forEach(function (button) { button.classList.toggle('active', button.getAttribute('data-section') === section); });
    loadItems(false).then(function () {
      var activeNav = document.querySelector('[data-section="' + section + '"]');
      if (activeNav) activeNav.focus();
      window.scrollTo(0, 0);
    });
  }

  function openDetail(item) {
    state.active = item;
    detailKicker.textContent = item.category + ' · ' + (item.type || 'Harbor');
    detailTitle.textContent = item.name;
    detailMeta.textContent = item.meta || '';
    detailSummary.textContent = item.summary || 'Open this title in Harbor.';
    updateSaveButtons();
    detailPanel.hidden = false;
    setTimeout(function () { detailPlay.focus(); }, 0);
  }

  function addHistory(item) {
    state.history = [snapshot(item)].concat(state.history.filter(function (entry) { return entry.id !== item.id; })).slice(0, 60);
    persist();
  }

  function streamRoutes(item) {
    var isTv = item.type === 'tv' || item.type === 'anime';
    if (!item.tmdbId) return [];
    return isTv ? [
      'https://vidlink.pro/tv/' + item.tmdbId + '/1/1',
      'https://vidsrc.to/embed/tv/' + item.tmdbId + '/1/1',
      'https://autoembed.to/tv/tmdb/' + item.tmdbId + '/1/1'
    ] : [
      'https://vidlink.pro/movie/' + item.tmdbId,
      'https://vidsrc.to/embed/movie/' + item.tmdbId,
      'https://autoembed.to/movie/tmdb/' + item.tmdbId
    ];
  }

  function resetPlayer() {
    tvFrame.hidden = true; tvFrame.src = 'about:blank';
    tvVideo.pause(); tvVideo.hidden = true; tvVideo.removeAttribute('src');
    tvAudio.pause(); tvAudio.hidden = true; tvAudio.removeAttribute('src');
    playerStatus.hidden = false;
  }

  function openPlayer(item) {
    if (!item) return;
    addHistory(item); resetPlayer(); detailPanel.hidden = true; playerPanel.hidden = false; playerTitle.textContent = item.name;
    if (item.directStream) { tvVideo.src = item.directStream; tvVideo.hidden = false; tvVideo.addEventListener('canplay', function ready() { playerStatus.hidden = true; tvVideo.removeEventListener('canplay', ready); }, { once: true }); return; }
    if (item.preview) { tvAudio.src = item.preview; tvAudio.hidden = false; tvAudio.addEventListener('canplay', function readyAudio() { playerStatus.hidden = true; tvAudio.removeEventListener('canplay', readyAudio); }, { once: true }); return; }
    var routes = streamRoutes(item);
    if (routes.length) { tvFrame.hidden = false; tvFrame.src = routes[0]; tvFrame.addEventListener('load', function readyFrame() { playerStatus.hidden = true; tvFrame.removeEventListener('load', readyFrame); }, { once: true }); return; }
    if (item.url) { tvFrame.hidden = false; tvFrame.src = item.url; tvFrame.addEventListener('load', function readyUrl() { playerStatus.hidden = true; tvFrame.removeEventListener('load', readyUrl); }, { once: true }); return; }
    playerStatus.innerHTML = '<h3>This title needs a supported source.</h3><p>Try another title or category.</p>';
  }

  function closeLayer(name) {
    if (name === 'search') searchPanel.hidden = true;
    if (name === 'detail') detailPanel.hidden = true;
    if (name === 'player') { resetPlayer(); playerPanel.hidden = true; }
  }

  function moveFocus(direction) {
    var current = document.activeElement;
    var candidates = Array.prototype.slice.call(document.querySelectorAll('.focusable:not([disabled])')).filter(function (element) { var rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; });
    if (!current || !candidates.includes(current)) { if (candidates[0]) candidates[0].focus(); return; }
    var from = current.getBoundingClientRect(); var fx = from.left + from.width / 2; var fy = from.top + from.height / 2;
    var best = null; var bestScore = Infinity;
    candidates.forEach(function (candidate) {
      if (candidate === current) return;
      var rect = candidate.getBoundingClientRect(); var x = rect.left + rect.width / 2; var y = rect.top + rect.height / 2; var dx = x - fx; var dy = y - fy;
      if ((direction === 'left' && dx >= -4) || (direction === 'right' && dx <= 4) || (direction === 'up' && dy >= -4) || (direction === 'down' && dy <= 4)) return;
      var primary = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy); var secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx); var score = primary + secondary * 2.7;
      if (score < bestScore) { bestScore = score; best = candidate; }
    });
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
  }

  document.querySelectorAll('[data-section]').forEach(function (button) { button.addEventListener('click', function () { setSection(button.getAttribute('data-section')); }); });
  document.querySelector('[data-action="home"]').addEventListener('click', function (event) { event.preventDefault(); setSection('Home'); });
  document.getElementById('search-button').addEventListener('click', function () { searchPanel.hidden = false; searchInput.placeholder = 'Search ' + (state.subcategory === 'All' ? state.section : state.subcategory); setTimeout(function () { searchInput.focus(); }, 0); });
  document.getElementById('list-button').addEventListener('click', function () { state.section = 'Home'; state.subcategory = 'My List'; state.query = ''; state.page = 1; loadItems(false); });
  searchForm.addEventListener('submit', function (event) { event.preventDefault(); state.query = searchInput.value.trim(); state.page = 1; searchPanel.hidden = true; loadItems(false); });
  heroPlay.addEventListener('click', function () { openDetail(state.active); });
  detailPlay.addEventListener('click', function () { openPlayer(state.active); });
  heroSave.addEventListener('click', function () { toggleSaved(state.active); });
  detailSave.addEventListener('click', function () { toggleSaved(state.active); });
  moreButton.addEventListener('click', function () { state.page += 1; loadItems(true); });
  document.querySelectorAll('[data-close]').forEach(function (button) { button.addEventListener('click', function () { closeLayer(button.getAttribute('data-close')); }); });
  tvFrame.addEventListener('load', function () { try { if (tvFrame.contentWindow) tvFrame.contentWindow.open = function () { return null; }; } catch (_) {} });

  document.addEventListener('keydown', function (event) {
    var key = event.key;
    var code = event.keyCode;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key) && document.activeElement !== searchInput) { event.preventDefault(); moveFocus(key.replace('Arrow', '').toLowerCase()); }
    if (key === 'Escape' || code === 461 || code === 10009 || code === 4) {
      event.preventDefault();
      if (!playerPanel.hidden) closeLayer('player'); else if (!detailPanel.hidden) closeLayer('detail'); else if (!searchPanel.hidden) closeLayer('search'); else setSection('Home');
    }
  });

  setSection('Home');
}());
