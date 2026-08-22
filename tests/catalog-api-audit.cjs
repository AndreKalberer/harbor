const port = process.argv[2] || '9336';

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

  const response = await command('Runtime.evaluate', {
    expression: `(async () => {
      const requests = {
        animeMovies: TMDB_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&include_adult=false&with_genres=16&with_original_language=ja&page=1',
        animeShows: TMDB_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&include_adult=false&with_genres=16&with_original_language=ja&page=1',
        sportsKeyword: TMDB_BASE + '/search/keyword?api_key=' + TMDB_API_KEY + '&query=sport&page=1',
        sportsMovies: TMDB_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&include_adult=false&with_keywords=333328&page=1',
        sportsShows: TMDB_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&include_adult=false&with_keywords=333328&page=1',
        booksAnyField: 'https://openlibrary.org/search.json?q=*%3A*&limit=0&fields=key',
        booksByType: 'https://openlibrary.org/search.json?q=type%3Awork&limit=0&fields=key',
        booksByLanguage: 'https://openlibrary.org/search.json?q=language%3A*&limit=0&fields=key',
        comics: 'https://openlibrary.org/subjects/comics.json?limit=1',
        manga: 'https://openlibrary.org/subjects/manga.json?limit=1',
        lightNovels: 'https://openlibrary.org/subjects/light_novels.json?limit=1',
        audiobooks: 'https://openlibrary.org/subjects/audiobooks.json?limit=1',
        comicsSearch: 'https://openlibrary.org/search.json?q=subject%3Acomics&limit=0&fields=key',
        mangaSearch: 'https://openlibrary.org/search.json?q=subject%3Amanga&limit=0&fields=key',
        lightNovelsSearch: 'https://openlibrary.org/search.json?q=%22light%20novel%22&limit=0&fields=key',
        audiobooksSearch: 'https://openlibrary.org/search.json?q=subject%3Aaudiobooks&limit=0&fields=key',
        musicRecordings: 'https://musicbrainz.org/ws/2/recording/?query=*%3A*&limit=1&fmt=json',
        soundtracks: 'https://musicbrainz.org/ws/2/recording/?query=tag%3Asoundtrack&limit=1&fmt=json',
        radio: 'https://de1.api.radio-browser.info/json/stats',
        podcasts: 'https://api.podcastindex.org/api/1.0/stats/current'
      };
      const entries = await Promise.all(Object.entries(requests).map(async ([key, url]) => {
        try {
          const result = await fetch(url);
          const data = await result.json();
          return [key, {
            ok: result.ok,
            total: data.total_results ?? data.numFound ?? data.num_found ?? data.work_count ?? data.count ?? data.stations ?? data.feeds ?? null,
            first: data.results?.[0] ?? null
          }];
        } catch (error) {
          return [key, { ok: false, error: error.message }];
        }
      }));
      return Object.fromEntries(entries);
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  }
  socket.close();
  process.stdout.write(JSON.stringify(response.result.value, null, 2) + '\n');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
