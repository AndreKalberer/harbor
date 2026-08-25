const port = process.argv[2] || '9333';

const run = async () => {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page'
    && item.title === 'Harbor'
    && /\/app\/index\.html(?:$|[?#])/i.test(item.url));
  if (!target) throw new Error('Harbor desktop debug target was not found.');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data.toString());
    if (!payload.id || !pending.has(payload.id)) return;
    const handlers = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) handlers.reject(new Error(payload.error.message));
    else handlers.resolve(payload.result);
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
    const response = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };

  await command('Runtime.enable');
  await evaluate(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 10000;
    const ready = () => typeof setActiveSection === 'function'
      && document.querySelectorAll('#resource-list .media-card').length > 0;
    if (ready()) return resolve();
    const timer = setInterval(() => {
      if (ready()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() >= deadline) {
        clearInterval(timer);
        reject(new Error('Harbor Watch controls did not become ready.'));
      }
    }, 25);
  })`);
  const result = await evaluate(`(async () => {
    setActiveSection('Watch');
    const originalDirectory = watchBrowseApi.loadLiveDirectory;
    const originalGuide = watchBrowseApi.loadLiveGuide;
    const liveChannels = [
      { id: 'NBATV.us@SD', channelId: 'NBATV.us', feedId: 'SD', name: 'NBA Basketball', logo: '', group: 'Sports', groups: ['Sports'], categories: ['sports'], countryCode: 'US', countryName: 'United States', countryFlag: '🇺🇸', languageCodes: ['eng'], languageNames: ['English'], sports: ['basketball'], url: 'https://media.example/nba.m3u8', streams: [{ url: 'https://media.example/nba.m3u8', type: 'hls', quality: '1080p', label: '' }] },
      { id: 'Soccer.es@SD', channelId: 'Soccer.es', feedId: 'SD', name: 'Fútbol Mundial', logo: '', group: 'Sports', groups: ['Sports'], categories: ['sports'], countryCode: 'ES', countryName: 'Spain', countryFlag: '🇪🇸', languageCodes: ['spa'], languageNames: ['Spanish'], sports: ['soccer'], url: 'https://media.example/soccer.m3u8', streams: [{ url: 'https://media.example/soccer.m3u8', type: 'hls', quality: '720p', label: '' }] }
    ];
    watchBrowseApi.loadLiveDirectory = async (_section, _filter, options) => {
      const needle = String(options.query || '').toLowerCase();
      const channels = liveChannels.filter((channel) => (!options.country || channel.countryCode === options.country)
        && (!options.language || channel.languageCodes.includes(options.language))
        && (!needle || (channel.name + ' ' + channel.countryName + ' ' + channel.languageNames.join(' ')).toLowerCase().includes(needle)));
      return { channels, total: channels.length, cached: false, facets: { countries: [{ code: 'ES', name: 'Spain', flag: '🇪🇸' }, { code: 'US', name: 'United States', flag: '🇺🇸' }], languages: [{ code: 'eng', name: 'English' }, { code: 'spa', name: 'Spanish' }], sports: [] } };
    };
    watchBrowseApi.loadLiveGuide = async () => ({ status: 'available', provider: 'Harbor fixture', language: 'en', programmes: [
      { title: 'Live Basketball', description: 'Fixture guide programme.', start: new Date(Date.now() - 60000).toISOString(), stop: new Date(Date.now() + 3600000).toISOString(), current: true },
      { title: 'Basketball Later This Week', start: new Date(Date.now() + 172800000).toISOString(), stop: new Date(Date.now() + 176400000).toISOString(), current: false }
    ] });
    const category = (name) => [...document.querySelectorAll('.category-button')]
      .find((button) => button.querySelector('.category-name')?.textContent === name);
    const filterLabels = () => [...document.querySelectorAll('#watch-filter-list button')].map((button) => button.textContent.trim());

    category('Movies').click();
    const movies = {
      labels: filterLabels(),
      active: document.querySelector('#watch-filter-list .active')?.textContent.trim(),
      hidden: document.querySelector('#watch-filter-list').hidden
    };
    [...document.querySelectorAll('#watch-filter-list button')].find((button) => button.textContent.trim() === 'Horror').click();
    const horror = {
      active: document.querySelector('#watch-filter-list .active')?.textContent.trim(),
      cards: [...document.querySelectorAll('.category-grid .media-card-title')].map((node) => node.textContent.trim())
    };

    category('Sports').click();
    const sports = filterLabels();
    const deadline = Date.now() + 3000;
    while ((document.querySelectorAll('#live-country-select option').length < 3 || document.querySelectorAll('.category-grid .media-card').length < 2) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const country = document.querySelector('#live-country-select');
    country.value = 'US';
    country.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    const language = document.querySelector('#live-language-select');
    language.value = 'eng';
    language.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    beginSearch('basketball');
    await new Promise((resolve) => setTimeout(resolve, 240));
    const liveControls = {
      visible: !document.querySelector('#live-directory-controls').hidden,
      countries: document.querySelectorAll('#live-country-select option').length,
      languages: document.querySelectorAll('#live-language-select option').length,
      cards: [...document.querySelectorAll('#resource-list .media-card-title')].map((node) => node.textContent.trim()),
      status: document.querySelector('#live-directory-status').textContent
    };
    document.querySelector('#resource-list .media-card-open').click();
    await new Promise((resolve) => setTimeout(resolve, 40));
    liveControls.guide = [...document.querySelectorAll('.detail-guide-list strong')].map((node) => node.textContent.trim());
    document.querySelector('#close-detail-dialog-btn').click();
    query = ''; searchInput.value = '';
    category('Live TV').click();
    const liveTv = filterLabels();
    watchBrowseApi.loadLiveDirectory = originalDirectory;
    watchBrowseApi.loadLiveGuide = originalGuide;
    resetFilters();
    return { movies, horror, sports, liveTv, liveControls, hlsLoaded: typeof Hls === 'function' };
  })()`);

  if (result.movies.labels.length < 8 || result.movies.active !== 'Popular' || result.movies.hidden
      || result.horror.active !== 'Horror' || result.sports.length < 8 || result.liveTv.length < 8
      || !result.liveControls.visible || result.liveControls.countries < 3 || result.liveControls.languages < 3
      || result.liveControls.cards.join('|') !== 'NBA Basketball' || result.liveControls.guide.join('|') !== 'Live Basketball|Basketball Later This Week'
      || !result.liveControls.status.includes('compatible channels') || !result.hlsLoaded) {
    throw new Error('Desktop Watch filter regression failed: ' + JSON.stringify(result));
  }
  socket.close();
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
