const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const watchBrowse = require('../shared/watch-browse');
const userStateApi = require('../shared/user-state');

const movies = watchBrowse.buildTmdbRequest('Anime', 'movies', 3);
assert.equal(movies.endpoint, 'discover/movie', 'Anime Movies must use the movie API');
assert.equal(movies.mediaType, 'movie', 'Anime film playback must retain movie identity');
assert.equal(movies.params.page, '3');
assert.equal(movies.params.with_genres, '16');
assert.equal(movies.params.with_original_language, 'ja');
assert.equal(watchBrowse.isTmdbAnime({ genre_ids: [16], original_language: 'ja' }), true);
assert.equal(watchBrowse.isTmdbAnime({ genre_ids: [16], original_language: 'en', origin_country: ['JP'] }), true);
assert.equal(watchBrowse.isTmdbAnime({ genre_ids: [16], original_language: 'en', origin_country: ['US'] }), false);
assert.equal(watchBrowse.isTmdbAnime({ genre_ids: [18], original_language: 'ja' }), false);
assert.equal(watchBrowse.isTmdbAnime({ genre_ids: [16] }), false, 'Missing provenance must not label every animation as anime');
assert.equal(watchBrowse.isTmdbAnime(null), false);
assert.equal(watchBrowse.isTmdbAnime({ genre_ids: '16', original_language: 'ja' }), false);

const slice = (file, start, end) => {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a);
  return source.slice(a, b);
};
const film = { id: 128, title: 'Harbor Anime', media_type: 'movie', genre_ids: [16], original_language: 'ja', release_date: '1997-07-12' };
const series = { ...film, title: undefined, name: 'Harbor Anime', media_type: 'tv', first_air_date: '1997-07-12' };
const western = { ...film, id: 129, original_language: 'en', origin_country: ['US'] };
const desktop = vm.createContext({ watchBrowseApi: watchBrowse, normalizeSearchText: value => String(value).toLowerCase() });
vm.runInContext(slice('app/renderer.js', 'const TMDB_GENRE_LABELS =', 'const liveItemId ='), desktop);
desktop.film = film; desktop.series = series;
const desktopFilm = vm.runInContext('formatTmdbItem(film)', desktop);
const desktopSeries = vm.runInContext('formatTmdbItem(series)', desktop);
assert.equal(desktopFilm.type, 'movie'); assert(desktopFilm.sections.includes('Anime'));
assert.equal(desktopSeries.type, 'anime');
assert.equal(desktopFilm.id, 'tmdb-128', 'Existing stored movie IDs remain compatible');
assert.equal(desktopSeries.id, 'tmdb-128', 'Existing stored series IDs remain compatible');
assert.equal(watchBrowse.matchesLocalFilter(desktopFilm, 'Anime', 'movies'), true);
assert.equal(watchBrowse.matchesLocalFilter(desktopSeries, 'Anime', 'movies'), false);
const regularSeries = vm.runInContext('formatTmdbItem({...series, genre_ids:[18],original_language:"en"})', desktop);
for (const item of [desktopFilm, regularSeries, desktopSeries]) {
  const oldItem = { ...item, sections: item.type === 'movie' ? ['Movie', 'Feature', 'Animation'] : item.sections };
  const saved = { favorites: [oldItem], history: [oldItem], progress: { [oldItem.id]: { item: oldItem, progress: 0.4, season: 2, episode: 3 } } };
  const roundTrip = userStateApi.normalize(userStateApi.normalize(saved));
  assert.equal(roundTrip.favorites[0].id, item.id);
  assert.equal(roundTrip.favorites[0].type, item.type);
  assert.equal(roundTrip.history[0].id, item.id);
  assert.equal(roundTrip.progress[item.id].progress, 0.4);
  assert.equal(roundTrip.progress[item.id].episode, 3);
}

(async () => {
  const noKey = vm.createContext({
    animeCatalogApi: require('../shared/anime-catalog.js'), NO_KEY_ANIME_CATALOG: [desktopSeries],
    TMDB_API_KEY: '', normalizeSearchText: value => value.toLowerCase(),
    isCurrentSearchRequest: () => true, localSearchResults: () => [desktopSeries], renderResources: () => {},
    currentMediaList: [], searchState: {}, fetchSearchJson: () => { throw new Error('No-key Anime search must remain local'); }
  });
  vm.runInContext(slice('app/renderer.js', 'const searchGlobalMedia =', 'const beginSearch ='), noKey);
  await vm.runInContext('searchGlobalMedia("Harbor", 1, {category:"Watch",subcategory:"Anime"})', noKey);
  assert.equal(noKey.currentMediaList.length, 1); assert.equal(noKey.searchState.partial, false);
  const requests = [];
  const tv = vm.createContext({
    watchBrowseApi: watchBrowse, TMDB_IMAGE: '', TMDB_GENRE_LABELS: { 16: 'Animation' }, TMDB_KEY: 'fixture',
    state: { subcategory: 'Anime', watchFilter: 'popular' },
    itemMatchesQuery: () => true,
    requestJson: async url => {
      requests.push(url);
      return { results: url.includes('search/tv') ? [series] : [film, western], page: 3, total_pages: 4 };
    }
  });
  vm.runInContext(slice('tv/tv.js', '  function normalizeTmdb(', '  function liveItemId('), tv);
  vm.runInContext(slice('tv/tv.js', '  function matchesWatchSubcategory(', '  function revealFocused('), tv);
  vm.runInContext(slice('tv/tv.js', '  function fetchWatch(', '  function syncOverlayAccessibility('), tv);
  vm.runInContext(slice('tv/tv.js', '  function streamRoutes(', '  function showPlayerStatus('), tv);
  tv.western = western;
  assert.equal(vm.runInContext('normalizeTmdb(western, "anime").type', tv), 'tv', 'Anime request hints must not bypass trusted provenance');
  const mixed = await vm.runInContext('fetchWatch("Harbor Anime", 1)', tv);
  assert.deepEqual(Array.from(mixed, item => item.type), ['movie', 'anime']);
  assert.equal(new Set(mixed.map(item => item.id)).size, 2, 'Equal numeric IDs must preserve movie and series results');
  assert(requests.some(url => url.includes('/search/movie')) && requests.some(url => url.includes('/search/tv')));
  tv.state.watchFilter = 'movies'; requests.length = 0;
  const moviesOnly = await vm.runInContext('fetchWatch("Harbor Anime", 1)', tv);
  assert.deepEqual(Array.from(moviesOnly, item => item.type), ['movie']);
  requests.length = 0;
  const browse = await vm.runInContext('fetchWatch("", 3)', tv);
  assert(requests[0].includes('/discover/movie?') && requests[0].includes('page=3'));
  tv.movie = moviesOnly[0];
  const routes = vm.runInContext('streamRoutes(movie, 9, 99)', tv);
  assert(routes.every(route => route.url.includes('/movie/128') && !route.url.includes('/tv/')));
  assert.equal(browse[0].type, 'movie');
  assert.equal(browse.length, 1, 'Anime browse must exclude western animation');
  assert.equal(browse.catalogCanLoadMore, true, 'Movie pages use API pagination even after filtering');
  process.stdout.write('Anime films: source requests, trusted classification, mixed search, type-aware identity, filters and movie routes passed.\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
