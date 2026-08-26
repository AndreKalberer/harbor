const fs = require('node:fs');
const path = require('node:path');

const port = process.argv[2] || '9343';
const isHarborTarget = (target) => target.type === 'page'
  && (target.title === 'Harbor TV' || /\/tv\/index\.html(?:$|[?#])/i.test(target.url));

const run = async () => {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
  const target = targets.find(isHarborTarget);
  if (!target) throw new Error('Harbor TV debug target was not found.');
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
  await command('Page.enable');
  await evaluate(`new Promise((resolve) => {
    const watch = document.querySelector('[data-action="watch"]');
    const ready = () => document.activeElement === watch;
    if (ready()) return resolve();
    const timeout = setTimeout(resolve, 2000);
    const timer = setInterval(() => {
      if (!ready()) return;
      clearInterval(timer);
      clearTimeout(timeout);
      resolve();
    }, 25);
  })`);
  await evaluate(`(() => {
    document.querySelector('[data-action="watch"]').click();
    window.scrollTo(0, 0);
  })()`);
  await evaluate(`new Promise((resolve) => {
    const ready = () => document.querySelectorAll('#card-grid .media-card').length > 0;
    if (ready()) return resolve();
    const timeout = setTimeout(resolve, 12000);
    const timer = setInterval(() => { if (ready()) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 100);
  })`);
  const shell = await evaluate(`({
    title: document.title,
    viewport: [innerWidth, innerHeight],
    nav: [...document.querySelectorAll('.tv-nav button[data-section]')].map((node) => node.textContent.trim()),
    categories: [...document.querySelectorAll('#subcategory-row button')].map((node) => node.textContent.trim()),
    cards: document.querySelectorAll('#card-grid .media-card').length,
    cardImages: document.querySelectorAll('#card-grid .media-card img').length,
    loadedImages: [...document.querySelectorAll('#card-grid .media-card img')].filter((image) => image.complete && image.naturalWidth > 0).length,
    visibleFallbacks: [...document.querySelectorAll('#card-grid .media-art-fallback')].filter((node) => !node.hidden).length,
    fallbackOverLoadedImages: [...document.querySelectorAll('#card-grid .media-card')].filter((card) => {
      const image = card.querySelector('img');
      const fallback = card.querySelector('.media-art-fallback');
      return image?.complete && image.naturalWidth > 0 && fallback && !fallback.hidden;
    }).length,
    artworkWithoutFallback: [...document.querySelectorAll('#card-grid .media-card')].filter((card) => {
      const image = card.querySelector('img');
      const fallback = card.querySelector('.media-art-fallback');
      const imageLoaded = image?.complete && image.naturalWidth > 0;
      return !imageLoaded && (!fallback || fallback.hidden);
    }).length,
    cardLabels: [...document.querySelectorAll('#card-grid .media-card')].map((node) => node.getAttribute('aria-label')),
    playerSandbox: document.querySelector('#tv-frame').getAttribute('sandbox'),
    playerTabIndex: document.querySelector('#tv-frame').tabIndex,
    playerFocusable: document.querySelector('#tv-frame').classList.contains('focusable'),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  })`);
  if (shell.nav.join('|') !== 'Home|Watch|Listen' || shell.cards < 1 || shell.fallbackOverLoadedImages !== 0 || shell.artworkWithoutFallback !== 0
      || shell.cardLabels.some((label) => !label || /^[A-Z] (movie|series|anime)/i.test(label))
      || shell.horizontalOverflow || shell.playerSandbox !== null || shell.playerTabIndex !== 0 || !shell.playerFocusable) {
    throw new Error('TV shell regression failed: ' + JSON.stringify(shell));
  }
  const watchFilters = await evaluate(`(() => {
    const category = (name) => [...document.querySelectorAll('#subcategory-row button')].find((button) => button.textContent.trim() === name);
    const sports = category('Sports');
    sports.click();
    const sportsFilters = [...document.querySelectorAll('#watch-filter-row button')].map((button) => button.textContent.trim());
    category('Sports').focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    const downReachedFilter = document.activeElement === document.querySelector('#watch-filter-row .active');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    const downReachedLiveFacet = document.querySelector('#live-filter-row').contains(document.activeElement);
    if (!document.querySelector('#card-grid .media-card')) {
      const fixtureCard = document.createElement('button'); fixtureCard.className = 'media-card focusable'; fixtureCard.type = 'button'; document.querySelector('#card-grid').appendChild(fixtureCard);
    }
    document.querySelector('#live-filter-done').focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    const downReachedLiveCard = document.activeElement === document.querySelector('#card-grid .media-card');
    category('Live TV').click();
    const liveFilters = [...document.querySelectorAll('#watch-filter-row button')].map((button) => button.textContent.trim());
    document.querySelector('[data-action="watch"]').click();
    const liveWindows = [...document.querySelectorAll('.live-window-switch button')].map((button) => button.textContent.trim());
    return { sportsFilters, liveFilters, liveWindows, downReachedFilter, downReachedLiveFacet, downReachedLiveCard };
  })()`);
  if (watchFilters.sportsFilters.length < 8 || watchFilters.liveFilters.length < 8 || watchFilters.liveWindows.join('|') !== '● Live Now|Live Soon' || !watchFilters.downReachedFilter || !watchFilters.downReachedLiveFacet || !watchFilters.downReachedLiveCard) {
    throw new Error('TV Watch filters or D-pad lane failed: ' + JSON.stringify(watchFilters));
  }
  const liveGuide = await evaluate(`(async () => {
    const original = window.HarborWatchBrowse.loadLiveGuide;
    window.HarborWatchBrowse.loadLiveGuide = () => Promise.resolve({ status: 'available', provider: 'Harbor fixture', language: 'en', programmes: [
      { title: 'Live Match', description: 'TV guide fixture.', start: new Date(Date.now() - 60000).toISOString(), stop: new Date(Date.now() + 3600000).toISOString(), current: true },
      { title: 'Match Later This Week', start: new Date(Date.now() + 172800000).toISOString(), stop: new Date(Date.now() + 176400000).toISOString(), current: false }
    ] });
    document.querySelector('[data-action="watch"]').click();
    await new Promise((resolve) => setTimeout(resolve, 60));
    const liveCard = [...document.querySelectorAll('#card-grid .media-card')].find((card) => card.querySelector('h3')?.textContent === 'World Sports HD');
    liveCard.click();
    await new Promise((resolve) => setTimeout(resolve, 40));
    const result = { visible: !document.querySelector('#detail-live-guide').hidden, programmes: [...document.querySelectorAll('.detail-live-guide strong')].map((node) => node.textContent.trim()), playVisible: !document.querySelector('#detail-play').hidden };
    document.querySelector('[data-close="detail"]').click();
    window.HarborWatchBrowse.loadLiveGuide = original;
    return result;
  })()`);
  if (!liveGuide.visible || !liveGuide.playVisible || liveGuide.programmes.join('|') !== 'Live Match|Match Later This Week') {
    throw new Error('TV live guide detail failed: ' + JSON.stringify(liveGuide));
  }
  const searchNavigation = await evaluate(`(() => {
    document.querySelector('#search-button').click();
    const input = document.querySelector('#search-input');
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    const downReachedSubmit = document.activeElement === document.querySelector('#search-form button[type="submit"]');
    input.focus();
    input.value = '';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    return { downReachedSubmit, searchClosed: document.querySelector('#search-panel').hidden };
  })()`);
  if (!searchNavigation.downReachedSubmit || !searchNavigation.searchClosed) {
    throw new Error('TV search remote navigation failed: ' + JSON.stringify(searchNavigation));
  }
  await evaluate(`(() => {
    window.__originalTvState = localStorage.getItem('harbor:tv-state:v1');
    const currentState = JSON.parse(localStorage.getItem('harbor:tv-state:v1') || '{}');
    currentState.saved = [];
    localStorage.setItem('harbor:tv-state:v1', JSON.stringify(currentState));
    document.querySelector('#card-grid .media-card').click();
    document.querySelector('#detail-save').click();
    document.querySelector('#detail-panel').hidden = true;
    document.querySelector('[data-action="watch"]').focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
  })()`);
  const interaction = await evaluate(`({
    saved: JSON.parse(localStorage.getItem('harbor:tv-state:v1')).saved.length,
    detailTitle: document.querySelector('#detail-title').textContent,
    focused: document.activeElement.textContent.trim(),
    correctLane: document.activeElement === document.querySelector('#hero-play')
  })`);
  const enterOpened = await evaluate(`(() => {
    const card = document.querySelector('#card-grid .media-card');
    card.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    return !document.querySelector('#detail-panel').hidden;
  })()`);
  interaction.enterOpened = enterOpened;
  if (interaction.saved < 1 || !interaction.detailTitle || !interaction.correctLane || !interaction.enterOpened) {
    throw new Error('TV remote or My Harbor interaction failed: ' + JSON.stringify(interaction));
  }
  const bleach = await evaluate(`(async () => {
    document.querySelector('#detail-panel').hidden = true;
    document.querySelector('[data-action="watch"]').click();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    [...document.querySelectorAll('#subcategory-row button')].find((button) => button.textContent.trim() === 'Anime').click();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    document.querySelector('#search-button').click();
    const input = document.querySelector('#search-input');
    input.value = 'Bleach';
    document.querySelector('#search-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const names = [...document.querySelectorAll('#card-grid .media-card h3')].map((node) => node.textContent.trim());
    const imageCount = document.querySelectorAll('#card-grid .media-card img').length;
    document.querySelector('#card-grid .media-card').click();
    const started = Date.now();
    while (document.querySelectorAll('#season-select option').length < 2 && Date.now() - started < 10000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const options = [...document.querySelectorAll('#season-select option')].map((option) => option.textContent.trim());
    const seriesPlayHidden = document.querySelector('#detail-play').hidden;
    const focusOnEpisode = document.activeElement?.classList.contains('episode-button') || false;
    const originalEpisodes = document.querySelectorAll('#episode-grid .episode-button').length;
    const select = document.querySelector('#season-select');
    select.value = '2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const tybwEpisodes = document.querySelectorAll('#episode-grid .episode-button').length;
    document.querySelector('#detail-panel').hidden = true;
    document.querySelector('[data-action="watch"]').click();
    return { names, imageCount, options, seriesPlayHidden, focusOnEpisode, originalEpisodes, tybwEpisodes };
  })()`);
  if (bleach.names.length !== 1 || bleach.names[0] !== 'Bleach' || bleach.imageCount !== 1
      || bleach.options[0] !== 'Bleach · 366 episodes'
      || bleach.options[1] !== 'Thousand-Year Blood War · 50 episodes'
      || !bleach.seriesPlayHidden || !bleach.focusOnEpisode
      || bleach.originalEpisodes !== 30 || bleach.tybwEpisodes !== 30) {
    throw new Error('TV Bleach metadata regression failed: ' + JSON.stringify(bleach));
  }
  const artifactDirectory = process.env.HARBOR_QA_ARTIFACT_DIR;
  if (artifactDirectory) {
    fs.mkdirSync(artifactDirectory, { recursive: true });
    const screenshot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(path.join(artifactDirectory, 'ui-tv.png'), Buffer.from(screenshot.data, 'base64'));
  }
  await evaluate(`(() => {
    if (window.__originalTvState === null) localStorage.removeItem('harbor:tv-state:v1');
    else localStorage.setItem('harbor:tv-state:v1', window.__originalTvState);
    delete window.__originalTvState;
  })()`);
  socket.close();
  process.stdout.write(JSON.stringify({ shell, watchFilters, liveGuide, searchNavigation, interaction, bleach }, null, 2) + '\n');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
