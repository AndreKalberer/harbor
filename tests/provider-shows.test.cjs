const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../shared/watch-browse.js');
const read = file => process.env.HARBOR_QA_ASAR ? require('@electron/asar').extractFile(process.env.HARBOR_QA_ASAR, file).toString('utf8') : fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const slice = (file, start, end) => { const text = read(file); const a = text.indexOf(start); const b = text.indexOf(end, a); assert(a >= 0 && b > a); return text.slice(a, b); };
const row = id => ({ tmdb_id: id, title: 'Series ' + id, genre: 'Animation, Comedy', rating: '7.5', poster_url: 'https://image.tmdb.org/t/p/w500/show.jpg' });
const pageData = page => ({ page, total_pages: 3, total: 50, items: page === 1 ? [row(1), row(1), {}, null] : page === 2 ? [] : [row(3)] });
(async () => {
  assert.equal(api.defaultFilterId('TV Shows'), 'latest-library');
  assert.equal(api.buildTmdbRequest('TV Shows', 'latest-library', 1), null);
  const normalized = api.normalizeProviderShow(row(1));
  assert.equal(normalized.type, 'tv', 'Animation without origin evidence must not become Anime');
  assert.deepEqual(normalized.sections, ['TV Show', 'Series', 'Animation', 'Comedy']);
  assert.equal(api.normalizeProviderShow({ ...row(1), poster_url: 'javascript:alert(1)' }).artworkUrl, '');
  assert.equal(api.normalizeProviderShow({ ...row(1), tmdb_id: 'bad' }), null);
  assert.equal(api.normalizeProviderShow({ ...row(1), title: ' ' }), null);
  const requests = [];
  const request = async url => { requests.push(url); return pageData(Number(url.match(/page-(\d+)/)[1])); };
  assert.equal((await api.loadProviderShows(1, request)).items.length, 1);
  assert.equal((await api.loadProviderShows(2, request)).canLoadMore, true, 'Empty normalized pages preserve provider pagination');
  assert.equal((await api.loadProviderShows(3, request)).canLoadMore, false);
  for (const page of [0,-1,1.5,NaN,Infinity]) await assert.rejects(api.loadProviderShows(page, request));
  assert.equal(requests.length, 3);
  for (const data of [{}, { ...pageData(1), total: '50' }, { ...pageData(1), page: 2 }]) assert.throws(() => api.providerShowsPage(data, 1));
  const main = vm.createContext({ AbortSignal, app: { getVersion: () => 'test' }, net: { fetch: async url => ({ ok: true, json: async () => pageData(Number(url.match(/page-(\d+)/)[1])) }) } });
  vm.runInContext(slice('electron/main.cjs', 'const fetchVidSrcShows =', 'const isAllowedStreamUrl ='), main);
  assert.equal((await vm.runInContext('fetchVidSrcShows(null, 1)', main)).status, 'ok');
  assert.equal((await vm.runInContext('fetchVidSrcShows(null, 0)', main)).status, 'error');
  let fail = false;
  const desktop = vm.createContext({
    window: { harbor: { getVidSrcShows: async page => fail ? { status: 'error', message: 'outage' } : { status: 'ok', data: pageData(page) } } },
    watchBrowseApi: api, TMDB_API_KEY: '', activeCategory: 'Watch', activeSubcategory: 'TV Shows', activeWatchFilter: 'latest-library',
    loadedProviderShows: new Map(), seriesCatalogError: '', seriesCatalogRetryPage: 1, watchBrowseGeneration: 0, watchBrowseKey: '', watchBrowsePage: 1,
    watchBrowseItems: [], watchBrowseLoading: false, watchBrowseLoaded: false, watchBrowseCanLoadMore: false, query: '',
    currentWatchBrowseKey: () => 'shows', renderResources: () => {}, getSectionItems: () => [], itemMatchesWatchFilter: () => true, mediaKey: item => item.tmdbId, showStatusToast: () => {}
  });
  vm.runInContext(slice('app/renderer.js', 'const formatVidSrcMovie =', 'const loadMoreWatchBrowse ='), desktop);
  await vm.runInContext('loadActiveWatchBrowse()', desktop);
  assert.equal(desktop.watchBrowseItems.length, 1); assert.equal(desktop.watchBrowseCanLoadMore, true);
  fail = true; await vm.runInContext('loadActiveWatchBrowse({append:true})', desktop);
  assert.equal(desktop.watchBrowseItems.length, 1, 'Append outage preserves existing rows');
  assert.match(desktop.seriesCatalogError, /outage/); assert.equal(desktop.watchBrowsePage, 1);
  fail = false; await vm.runInContext('loadActiveWatchBrowse({append:true})', desktop);
  assert.equal(desktop.watchBrowsePage, 2); assert.equal(desktop.watchBrowseCanLoadMore, true);
  await vm.runInContext('loadActiveWatchBrowse({append:true})', desktop);
  assert.deepEqual(Array.from(desktop.watchBrowseItems, item => item.tmdbId), ['1','3']); assert.equal(desktop.watchBrowseCanLoadMore, false);
  const tv = vm.createContext({ loadedProviderShows: {}, fallbackWatch: [], liveItems: [], matchesWatchSubcategory: () => true, matchesWatchFilter: () => true, state: { subcategory: 'TV Shows', watchFilter: 'latest-library' }, watchBrowseApi: api, requestJson: request, TMDB_KEY: '' });
  vm.runInContext(slice('tv/tv.js', '  function fetchWatch(', '  function syncOverlayAccessibility('), tv);
  const tvItems = await vm.runInContext('fetchWatch("", 1)', tv);
  assert.equal(tvItems[0].section, 'TV Shows'); assert.equal(tvItems[0].type, 'tv'); assert.equal(tvItems.catalogCanLoadMore, true);
  const lastItems = await vm.runInContext('fetchWatch("", 3)', tv); assert.equal(lastItems.catalogCanLoadMore, false);
  const searched = await vm.runInContext('fetchWatch("Series 3", 1)', tv); assert.equal(searched.length, 1); assert.equal(searched[0].tmdbId, '3'); assert.equal(searched.catalogCanLoadMore, false, 'Local cache search cannot fetch another upstream page');
  // Run the real search entry points, including a stale cached miss followed by
  // loading another provider page. Local provider search must never contact TMDB.
  const searchRequests = [];
  const searchScope = { category: 'Watch', subcategory: 'TV Shows' };
  const search = vm.createContext({
    loadedProviderShows: new Map(), WATCH_CATALOG: [], TMDB_API_KEY: '', TMDB_BASE: 'https://api.themoviedb.org/3',
    activeCategory: 'Watch', activeSubcategory: 'TV Shows', watchBrowseLoaded: false, discoveryMediaList: [],
    query: '', searchTimeout: null, searchController: null, searchSequence: 0, currentMediaList: [], searchState: {},
    searchCache: new Map(), SEARCH_CACHE_TTL_MS: 60000, SEARCH_DEBOUNCE_MS: 0, AbortController,
    normalizeSearchText: text => text.toLowerCase(), getSearchScope: () => searchScope, getSearchCacheKey: term => term,
    itemMatchesSearchScope: item => item.type === 'tv', rankSearchResults: (items, term) => items.filter(item => item.name.toLowerCase().includes(term.toLowerCase())),
    isCurrentSearchRequest: () => true, isLiveDirectory: () => false, renderResources: () => {},
    clearTimeout: () => {}, setTimeout: () => 1,
    fetchSearchJson: async url => { searchRequests.push(url); throw new Error('No-key search must stay local'); },
    formatTmdbItem: item => item, formatItunesItem: item => item, formatItunesPodcastItem: item => item,
    formatItunesAudiobookItem: item => item, formatOpenLibraryItem: item => item
  });
  vm.runInContext(slice('app/renderer.js', 'const localSearchResults =', 'const fetchSearchJson ='), search);
  vm.runInContext(slice('app/renderer.js', 'const searchGlobalMedia =', 'const loadMoreSearchResults ='), search);
  vm.runInContext('beginSearch("Series 3")', search);
  assert.equal(search.currentMediaList.length, 0);
  search.searchCache.set('Series 3', { createdAt: Date.now(), items: [], total: 0, partial: true });
  vm.runInContext('beginSearch("")', search);
  search.loadedProviderShows.set('3', api.normalizeProviderShow(row(3)));
  vm.runInContext('beginSearch("Series 3")', search);
  assert.equal(search.currentMediaList.length, 1, 'Repeated local search must recompute after a new provider page, even with a cached miss');
  assert.equal(search.searchState.loading, false); assert.equal(search.searchState.partial, false);
  await vm.runInContext('searchGlobalMedia("Series 3", searchSequence, getSearchScope())', search);
  assert.equal(search.currentMediaList.length, 1); assert.equal(searchRequests.length, 0, 'Shows with no key must never request TMDB');

  let tvFailure = false;
  const tvLoad = vm.createContext({
    itemLoadGeneration: 0, watchBrowseApi: api, document: {},
    state: { section: 'Watch', subcategory: 'TV Shows', watchFilter: 'latest-library', query: '', page: 1, items: [], canLoadMore: false },
    moreButton: {}, cardGrid: {}, rowKicker: {}, rowTitle: {},
    renderSubcategories: () => {}, renderHero: () => {}, renderCards: () => {}, notify: () => {},
    fetchCurrent: async (_query, page) => { if (tvFailure) throw new Error('outage'); const result = api.providerShowsPage(pageData(page), page); const items = result.items; items.catalogCanLoadMore = result.canLoadMore; return items; }
  });
  vm.runInContext(slice('tv/tv.js', '  function loadItems(', '  function setSection('), tvLoad);
  await vm.runInContext('loadItems(false)', tvLoad); assert.equal(tvLoad.state.canLoadMore, true, 'Short provider pages still permit Show more');
  tvLoad.state.page = 2; tvFailure = true; await vm.runInContext('loadItems(true)', tvLoad);
  assert.equal(tvLoad.state.page, 1, 'Append outage must retry the same page'); assert.equal(tvLoad.state.items.length, 1); assert.equal(tvLoad.state.canLoadMore, true);
  tvFailure = false; tvLoad.state.page = 2; await vm.runInContext('loadItems(true)', tvLoad); assert.equal(tvLoad.state.canLoadMore, true);
  tvLoad.state.page = 3; await vm.runInContext('loadItems(true)', tvLoad); assert.equal(tvLoad.state.items.length, 2); assert.equal(tvLoad.state.canLoadMore, false);
  console.log('Provider Shows: normalization, invalid pages/payloads, duplicates, empty-page continuation, outage preservation, IPC and both browse surfaces verified.');
})().catch(error => { console.error(error); process.exitCode = 1; });
