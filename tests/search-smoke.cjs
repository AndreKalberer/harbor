const port = process.argv[2] || '9334';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const run = async () => {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page' && item.title === 'Harbor');
  if (!target) throw new Error('Harbor debug target was not found.');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  let sequence = 0;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data.toString());
    if (!payload.id || !pending.has(payload.id)) return;
    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) reject(new Error(payload.error.message));
    else resolve(payload.result);
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async (expression) => {
    const response = await command('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result.value;
  };

  await command('Runtime.enable');
  await evaluate(`new Promise((resolve) => {
    const ready = () => document.querySelectorAll('#resource-list .media-card').length > 0;
    if (ready()) return resolve();
    const timer = setInterval(() => { if (ready()) { clearInterval(timer); resolve(); } }, 25);
  })`);

  const defaultFooter = await evaluate(`document.querySelector('#catalog-count').textContent`);
  if (!defaultFooter.startsWith('Millions of')) {
    throw new Error('The home footer still reports only the visible discovery batch.');
  }

  const categoryBadges = await evaluate(`(() => {
    applyCatalogTotalValues(new Map([
      ['movies', 1200000], ['shows', 230000], ['anime', 11414], ['sports', 485],
      ['music', 39920349], ['soundtracks', 66728], ['radio', 57430], ['audiobooks', 1367],
      ['books', 79200], ['comics', 100892], ['manga', 15600], ['lightNovels', 2044]
    ]));
    const result = {};
    for (const section of ['Watch', 'Listen', 'Read', 'Play']) {
      setActiveSection(section);
      result[section] = Object.fromEntries([...document.querySelectorAll('.category-button')].map((button) => [
        button.querySelector('.category-name').textContent,
        button.querySelector('.category-count').textContent
      ]));
    }
    setActiveSection('Home');
    return result;
  })()`);
  const expectedBadges = {
    Watch: { All: '1.4M', Movies: '1.2M', 'TV Shows': '230K', Anime: '11.4K', Sports: '485', 'Live TV': 'Live' },
    Listen: { All: '40M+', Music: '39.9M', Soundtracks: '66.7K', Radio: '57.4K', Podcasts: 'Full', Audiobooks: '1.4K' },
    Read: { All: '197.7K+', Books: '79.2K', Comics: '100.9K', Manga: '15.6K', 'Light Novels': '2K' },
    Play: { All: 'Library', 'PC Games': 'Library', Action: 'Library', RPG: 'Library', Adventure: 'Library', Strategy: 'Library' }
  };
  if (JSON.stringify(categoryBadges) !== JSON.stringify(expectedBadges)) {
    throw new Error('One or more category badges still reports the visible sample: ' + JSON.stringify(categoryBadges));
  }

  const musicCategoryDescription = await evaluate(`(() => {
    setActiveSection('Listen');
    activeSubcategory = 'Music';
    renderCategories();
    renderResources();
    return document.querySelector('.content-rail .rail-heading p')?.textContent;
  })()`);
  if (musicCategoryDescription !== 'Showing 5 featured picks from 39.9M searchable items') {
    throw new Error('The Music category does not distinguish featured picks from the searchable catalog: ' + musicCategoryDescription);
  }
  await evaluate(`setActiveSection('Home')`);

  await evaluate(`(() => {
    window.__harborOriginalFetch = window.fetch;
    window.__harborSearchRequests = [];
    window.fetch = (url, options = {}) => {
      const address = String(url);
      window.__harborSearchRequests.push(address);
      const parsed = new URL(address);
      const term = (parsed.searchParams.get('query') || parsed.searchParams.get('term') || parsed.searchParams.get('search') || parsed.searchParams.get('q') || parsed.searchParams.get('name') || '').toLowerCase();
      const wait = term === 'alpha' ? 700 : 20;
      let payload;

      if (address.includes('themoviedb.org')) {
        const isMovieSearch = address.includes('/search/movie');
        payload = term === 'alpha'
          ? { total_results: isMovieSearch ? 500 : 400, results: [isMovieSearch
              ? { id: 1, title: 'Alpha Wrong', release_date: '2022-01-01', vote_average: 6 }
              : { id: 6, name: 'Alpha Wrong Show', first_air_date: '2022-01-01', vote_average: 6 }
            ] }
          : (isMovieSearch
            ? { total_results: 200, results: [{ id: 3, title: 'Beta', release_date: '2024-01-01', vote_average: 9 }] }
            : { total_results: 121, results: [{ id: 2, name: 'The Beta Cut', first_air_date: '2023-01-01', vote_average: 8, genre_ids: [16], original_language: 'ja', origin_country: ['JP'] }] });
      } else if (address.includes('itunes.apple.com')) {
        const media = parsed.searchParams.get('media');
        payload = media === 'podcast'
          ? { resultCount: 2, results: [{ collectionId: 8, collectionName: term === 'alpha' ? 'Alpha Wrong Podcast' : 'Beta Podcast', artistName: 'Harbor Audio', primaryGenreName: 'Society' }] }
          : media === 'audiobook'
            ? { resultCount: 3, results: [{ collectionId: 9, collectionName: term === 'alpha' ? 'Alpha Wrong Audiobook' : 'Beta Audiobook', artistName: 'Harbor Audio', primaryGenreName: 'Fiction' }] }
            : { resultCount: 4, results: [{ trackId: 4, trackName: term === 'alpha' ? 'Alpha Wrong Song' : 'Beta Song', artistName: 'Harbor', releaseDate: '2024-01-01', primaryGenreName: 'Pop' }] };
      } else if (address.includes('radio-browser.info')) {
        payload = [{ stationuuid: 'station-1', name: term === 'alpha' ? 'Alpha Wrong Radio' : 'Beta Radio', country: 'US', votes: 200, url_resolved: 'https://example.com/radio.mp3' }];
      } else {
        payload = { numFound: 12, docs: [{ key: '/works/OL5W', title: term === 'alpha' ? 'Alpha Wrong Book' : 'Beta Book', author_name: ['Harbor'], first_publish_year: 2024, subject: ['Manga'] }] };
      }

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })), wait);
        options.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    };
  })()`);

  const immediate = await evaluate(`(() => {
    beginSearch('Dune');
    return {
      first: document.querySelector('#resource-list .media-card-title')?.textContent,
      loading: document.querySelector('#results-label').textContent
    };
  })()`);
  if (!immediate.first?.startsWith('Dune') || !immediate.loading.includes('so far')) {
    throw new Error('Local search results were not shown immediately.');
  }

  await evaluate(`beginSearch('alpha')`);
  await delay(220);
  await evaluate(`beginSearch('beta')`);
  await delay(500);

  const raced = await evaluate(`({
    title: document.querySelector('#directory-title').textContent,
    names: [...document.querySelectorAll('#resource-list .media-card-title')].map((element) => element.textContent),
    summary: document.querySelector('#results-label').textContent,
    footer: document.querySelector('#catalog-count').textContent
  })`);

  if (raced.names[0] !== 'Beta' || raced.names.some((name) => name.includes('Alpha Wrong'))) {
    throw new Error('A stale or poorly ranked search replaced the latest results: ' + JSON.stringify(raced));
  }
  if (!raced.title.includes('beta') || !raced.footer.startsWith('343 Harbor matches')) {
    throw new Error('The full-catalog search count was not reported correctly: ' + JSON.stringify(raced));
  }

  const cached = await evaluate(`(() => {
    beginSearch('beta');
    return {
      loading: searchState.loading,
      first: document.querySelector('#resource-list .media-card-title')?.textContent
    };
  })()`);
  if (cached.loading || cached.first !== 'Beta') {
    throw new Error('Repeated searches did not use the fast result cache.');
  }

  await evaluate(`(() => {
    setActiveSection('Watch');
    window.__harborSearchRequests = [];
    beginSearch('beta');
  })()`);
  await delay(500);
  const watchScoped = await evaluate(`({
    scope: [activeCategory, activeSubcategory],
    title: document.querySelector('#directory-title').textContent,
    footer: document.querySelector('#catalog-count').textContent,
    categories: [...new Set(currentMediaList.map((item) => item.category))],
    canLoadMore: searchState.canLoadMore,
    requests: [...window.__harborSearchRequests]
  })`);
  if (watchScoped.categories.join(',') !== 'Watch'
      || watchScoped.requests.length !== 2
      || watchScoped.requests.some((url) => !url.includes('themoviedb.org'))
      || !watchScoped.title.startsWith('Watch results')
      || !watchScoped.footer.startsWith('321 Watch matches')
      || !watchScoped.canLoadMore) {
    throw new Error('Watch search escaped its active tab: ' + JSON.stringify(watchScoped));
  }

  await evaluate(`(() => {
    window.__harborSearchRequests = [];
    loadMoreSearchResults();
  })()`);
  await delay(500);
  const watchPageTwo = await evaluate(`({
    page: searchState.page,
    categories: [...new Set(currentMediaList.map((item) => item.category))],
    requests: [...window.__harborSearchRequests]
  })`);
  if (watchPageTwo.page !== 2
      || watchPageTwo.categories.join(',') !== 'Watch'
      || watchPageTwo.requests.length !== 2
      || watchPageTwo.requests.some((url) => !url.includes('page=2'))) {
    throw new Error('Watch search pagination failed: ' + JSON.stringify(watchPageTwo));
  }

  await evaluate(`(() => {
    window.__harborSearchRequests = [];
    [...document.querySelectorAll('.category-button')]
      .find((button) => button.querySelector('.category-name')?.textContent === 'Anime')
      .click();
  })()`);
  await delay(500);
  const animeScoped = await evaluate(`({
    scope: [activeCategory, activeSubcategory],
    types: [...new Set(currentMediaList.map((item) => item.type))],
    requests: [...window.__harborSearchRequests],
    placeholder: document.querySelector('#resource-search').placeholder
  })`);
  if (animeScoped.scope.join('|') !== 'Watch|Anime'
      || animeScoped.types.join(',') !== 'anime'
      || animeScoped.requests.length !== 1
      || !animeScoped.requests[0].includes('/search/tv')
      || animeScoped.placeholder !== 'Search Anime') {
    throw new Error('Anime search escaped its active subcategory: ' + JSON.stringify(animeScoped));
  }

  await evaluate(`(() => {
    setActiveSection('Read');
    activeSubcategory = 'Manga';
    renderCategories();
    renderResources();
    window.__harborSearchRequests = [];
    beginSearch('beta');
  })()`);
  await delay(500);
  const mangaScoped = await evaluate(`({
    scope: [activeCategory, activeSubcategory],
    categories: [...new Set(currentMediaList.map((item) => item.category))],
    types: [...new Set(currentMediaList.map((item) => item.type))],
    requests: [...window.__harborSearchRequests]
  })`);
  if (mangaScoped.scope.join('|') !== 'Read|Manga'
      || mangaScoped.categories.join(',') !== 'Read'
      || mangaScoped.types.join(',') !== 'manga'
      || mangaScoped.requests.length !== 1
      || !mangaScoped.requests[0].includes('openlibrary.org')) {
    throw new Error('Manga search escaped its active subcategory: ' + JSON.stringify(mangaScoped));
  }

  await evaluate(`(() => {
    setActiveSection('Listen');
    activeSubcategory = 'Podcasts';
    renderCategories();
    renderResources();
    window.__harborSearchRequests = [];
    beginSearch('beta');
  })()`);
  await delay(500);
  const podcastScoped = await evaluate(`({
    scope: [activeCategory, activeSubcategory],
    categories: [...new Set(currentMediaList.map((item) => item.category))],
    types: [...new Set(currentMediaList.map((item) => item.type))],
    requests: [...window.__harborSearchRequests]
  })`);
  if (podcastScoped.scope.join('|') !== 'Listen|Podcasts'
      || podcastScoped.categories.join(',') !== 'Listen'
      || podcastScoped.types.join(',') !== 'podcast'
      || podcastScoped.requests.length !== 1
      || !podcastScoped.requests[0].includes('media=podcast')) {
    throw new Error('Podcast search escaped its active subcategory: ' + JSON.stringify(podcastScoped));
  }

  await evaluate(`(() => {
    setActiveSection('Play');
    activeSubcategory = 'Action';
    renderCategories();
    renderResources();
    window.__harborSearchRequests = [];
    beginSearch('Grand Theft');
  })()`);
  await delay(300);
  const playScoped = await evaluate(`({
    names: currentMediaList.map((item) => item.name),
    categories: [...new Set(currentMediaList.map((item) => item.category))],
    requests: [...window.__harborSearchRequests]
  })`);
  if (playScoped.names[0] !== 'Grand Theft Auto V'
      || playScoped.categories.join(',') !== 'Play'
      || playScoped.requests.length !== 0) {
    throw new Error('Play search escaped its local subcategory: ' + JSON.stringify(playScoped));
  }

  await evaluate(`(() => {
    window.fetch = window.__harborOriginalFetch;
    delete window.__harborOriginalFetch;
    delete window.__harborSearchRequests;
    resetFilters();
  })()`);

  socket.close();
  process.stdout.write(`${JSON.stringify({ defaultFooter, categoryBadges, musicCategoryDescription, immediate, raced, cached, watchScoped, watchPageTwo, animeScoped, mangaScoped, podcastScoped, playScoped }, null, 2)}\n`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
