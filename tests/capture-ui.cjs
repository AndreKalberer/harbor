const fs = require('node:fs');
const path = require('node:path');

const port = process.argv[2] || '9333';

const run = async () => {
  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.cjs'), 'utf8');
  const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer.js'), 'utf8');
  if (!mainSource.includes("on('did-attach-webview'")
      || !mainSource.includes("guestContents.setWindowOpenHandler(() => ({ action: 'deny' }))")) {
    throw new Error('The embedded player does not install its main-process popup blocker.');
  }
  if (!mainSource.includes("streamingSession.on('will-download'")
      || !rendererSource.includes('tryNextStreamRoute')
      || !rendererSource.includes('streamLoadTimeout')) {
    throw new Error('Playback recovery or embedded download blocking is missing.');
  }

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

  const capture = async (fileName) => {
    const screenshot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(path.join(__dirname, fileName), Buffer.from(screenshot.data, 'base64'));
  };
  const pressKey = async (key, code, virtualKeyCode) => {
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtualKeyCode, nativeVirtualKeyCode: virtualKeyCode });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKeyCode, nativeVirtualKeyCode: virtualKeyCode });
  };

  await command('Runtime.enable');
  await command('Page.enable');
  await command('Emulation.clearDeviceMetricsOverride');
  await evaluate(`(() => {
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    if (typeof resetLocalLibrary === 'function') resetLocalLibrary();
    if (typeof setActiveSection === 'function') setActiveSection('Home');
  })()`);
  await evaluate(`new Promise((resolve) => {
    const ready = () => document.querySelectorAll('#resource-list .media-card').length > 0 && getSectionItems('Listen').length === 12;
    if (ready()) return resolve();
    const timer = setInterval(() => { if (ready()) { clearInterval(timer); resolve(); } }, 50);
  })`);

  const shell = await evaluate(`({
    title: document.title,
    cards: document.querySelectorAll('#resource-list .media-card').length,
    sections: [...document.querySelectorAll('.primary-nav-button')].map((button) => button.textContent.trim()),
    mark: document.querySelector('.brand img').getAttribute('src'),
    streamAllowsPopups: document.querySelector('#stream-in-app-webview').hasAttribute('allowpopups'),
    technicalLabels: (document.body.innerText.match(/STREAM HOST|EMBED PROVIDER|PLAYBACK SOURCES|CHOOSE A PLAYBACK SOURCE/gi) || []).length,
    firstCard: (() => { const card = document.querySelector('#resource-list .media-card'); const art = card.querySelector('.media-art'); return [Math.round(card.getBoundingClientRect().width), Math.round(card.getBoundingClientRect().height), Math.round(art.getBoundingClientRect().width), Math.round(art.getBoundingClientRect().height), getComputedStyle(art).display]; })(),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  })`);
  if (shell.streamAllowsPopups) {
    throw new Error('The embedded player still grants popup permission.');
  }
  await evaluate(`playerButton.click()`);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await pressKey('Tab', 'Tab', 9);
  const myHarborTabStayedInside = await evaluate(`myHarborDialog.contains(document.activeElement)`);
  await pressKey('Escape', 'Escape', 27);
  await evaluate(`updateButton.focus(); updateButton.click()`);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await pressKey('Escape', 'Escape', 27);
  const keyboardDialogs = await evaluate(`(() => {
    const updateFocusRestored = document.activeElement === updateButton;
    searchInput.focus();
    const searchStyle = getComputedStyle(document.querySelector('.header-search'));
    return {
      myHarborTabStayedInside: ${JSON.stringify(myHarborTabStayedInside)},
      myHarborClosed: !myHarborDialog.open,
      updateClosed: !updateDialog.open,
      updateFocusRestored,
      searchOutline: searchStyle.outlineStyle !== 'none' && parseFloat(searchStyle.outlineWidth) > 0
    };
  })()`);
  if (!keyboardDialogs.myHarborTabStayedInside || !keyboardDialogs.myHarborClosed || !keyboardDialogs.updateClosed
      || !keyboardDialogs.updateFocusRestored || !keyboardDialogs.searchOutline) {
    throw new Error('Desktop keyboard dialog or focus regression failed: ' + JSON.stringify(keyboardDialogs));
  }
  const popupAttemptBlocked = await evaluate(`new Promise((resolve, reject) => {
    const webview = document.querySelector('#stream-in-app-webview');
    const timeout = setTimeout(() => reject(new Error('Popup-blocker webview test timed out.')), 5000);
    const testPopup = async () => {
      try {
        const blocked = await webview.executeJavaScript("window.open('about:blank') === null");
        clearTimeout(timeout);
        webview.src = 'about:blank';
        resolve(blocked);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    };
    webview.addEventListener('did-finish-load', testPopup, { once: true });
    webview.src = 'data:text/html,<title>Harbor popup test</title>';
  })`);
  if (!popupAttemptBlocked) {
    throw new Error('The embedded player allowed a runtime popup attempt.');
  }
  const playbackRecovery = await evaluate(`(async () => {
    activeMedia = discoveryMediaList.find((item) => item.category === 'Watch');
    if (!inAppStreamDialog.open) inAppStreamDialog.showModal();
    showStreamStatus('Testing recovery', 'Checking the consumer-facing retry state.', true);
    const shown = !streamStatusOverlay.hidden;
    const retryVisible = !streamRetryButton.hidden;
    const failed = streamStatusOverlay.classList.contains('failed');
    markStreamReady();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const hiddenAfterReady = streamStatusOverlay.hidden;
    inAppStreamDialog.close();
    return { shown, retryVisible, failed, hiddenAfterReady };
  })()`);
  if (!playbackRecovery.shown
      || !playbackRecovery.retryVisible
      || !playbackRecovery.failed
      || !playbackRecovery.hiddenAfterReady) {
    throw new Error('Playback recovery UI failed: ' + JSON.stringify(playbackRecovery));
  }
  const detailLoading = await evaluate(`(async () => {
    const sample = {
      id: 'qa-detail-loading', tmdbId: '', name: 'QA Loading Series', category: 'Watch', type: 'tv',
      year: '2026', rating: '10', sections: ['TV Shows'], overview: 'Local QA fixture.',
      seasons: [{ season_number: 1, name: 'Season 1', episode_count: 2 }]
    };
    const opening = openDetailDialog(sample);
    const visibleImmediately = mediaDetailDialog.open;
    const loadingVisible = detailEpisodesList.textContent.includes('Loading episodes');
    await opening;
    const episodes = detailEpisodesList.querySelectorAll('.ep-btn').length;
    if (mediaDetailDialog.open) mediaDetailDialog.close();
    activeMedia = null;
    return { visibleImmediately, loadingVisible, episodes };
  })()`);
  if (!detailLoading.visibleImmediately || !detailLoading.loadingVisible || detailLoading.episodes !== 2) {
    throw new Error('Series detail loading state failed: ' + JSON.stringify(detailLoading));
  }
  const episodePlayback = await evaluate(`(async () => {
    const sample = {
      id: 'qa-direct-episode', tmdbId: '', name: 'QA Direct Episode', category: 'Watch', type: 'tv',
      year: '2026', rating: '10', sections: ['TV Shows'], overview: 'Local QA fixture.',
      seasons: [{ season_number: 1, name: 'Season 1', episode_count: 2 }],
      directStream: 'data:video/mp4;base64,'
    };
    await openDetailDialog(sample);
    const episodeButton = document.querySelector('#detail-episodes-list .ep-btn');
    const separatePlayButton = document.querySelector('#detail-play-btn');
    episodeButton.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const result = {
      buttonFound: Boolean(episodeButton),
      separatePlayButton: Boolean(separatePlayButton),
      detailClosed: !mediaDetailDialog.open,
      playerOpened: inAppStreamDialog.open,
      selection: [activeSeason, activeEpisode]
    };
    streamDirectVideo.pause();
    streamDirectVideo.removeAttribute('src');
    if (inAppStreamDialog.open) inAppStreamDialog.close();
    activeMedia = null;
    return result;
  })()`);
  if (!episodePlayback.buttonFound
      || episodePlayback.separatePlayButton
      || !episodePlayback.detailClosed
      || !episodePlayback.playerOpened
      || episodePlayback.selection[0] !== 1
      || episodePlayback.selection[1] !== 1) {
    throw new Error('Direct episode playback failed: ' + JSON.stringify(episodePlayback));
  }
  await capture('ui-shell.png');

  await evaluate(`document.querySelector('[data-section="Watch"]').click()`);
  await capture('ui-watch.png');

  const hubs = await evaluate(`(() => {
    const result = {};
    for (const section of ['Watch', 'Listen', 'Read', 'Play']) {
      document.querySelector('[data-section="' + section + '"]').click();
      result[section] = {
        categories: [...document.querySelectorAll('.category-button')].map((button) => button.textContent.trim()),
        cards: document.querySelectorAll('#resource-list .media-card').length,
        externalCards: document.querySelectorAll('#resource-list .media-card[data-external="true"]').length
      };
    }
    document.querySelector('[data-section="Watch"]').click();
    return result;
  })()`);
  if (hubs.Listen.cards !== 12 || hubs.Read.cards !== 24 || hubs.Play.cards !== 8
      || hubs.Listen.externalCards !== hubs.Listen.cards
      || hubs.Read.externalCards !== hubs.Read.cards
      || hubs.Play.externalCards !== hubs.Play.cards) {
    throw new Error('Desktop link directory regression failed: ' + JSON.stringify(hubs));
  }

  const consumerState = await evaluate(`(() => {
    window.__harborOriginalUserState = localStorage.getItem(USER_STATE_KEY);
    userState = createDefaultUserState();
    const sample = discoveryMediaList.find((item) => item.category === 'Watch');
    toggleFavorite(sample);
    recordHistory(sample);
    recordProgress(sample, 0.42, { season: 1, episode: 3 });
    userState.settings.reduceMotion = true;
    persistUserState();
    const reloaded = loadUserState();
    openMyHarbor('continue');
    return {
      favorites: reloaded.favorites.length,
      history: reloaded.history.length,
      progress: Object.keys(reloaded.progress).length,
      reduceMotion: reloaded.settings.reduceMotion && document.documentElement.classList.contains('reduce-motion'),
      dialogOpen: myHarborDialog.open,
      visibleCards: document.querySelectorAll('#my-harbor-content .media-card').length
    };
  })()`);
  await capture('ui-my-harbor.png');
  await evaluate(`(() => {
    myHarborDialog.close();
    if (window.__harborOriginalUserState === null) localStorage.removeItem(USER_STATE_KEY);
    else localStorage.setItem(USER_STATE_KEY, window.__harborOriginalUserState);
    delete window.__harborOriginalUserState;
    userState = loadUserState();
    persistUserState();
    renderResources();
  })()`);
  if (consumerState.favorites !== 1
      || consumerState.history !== 1
      || consumerState.progress !== 1
      || !consumerState.reduceMotion
      || !consumerState.dialogOpen
      || consumerState.visibleCards !== 1) {
    throw new Error('My Harbor persistence or Continue rendering failed: ' + JSON.stringify(consumerState));
  }

  await evaluate(`playerDialog.showModal()`);
  await capture('ui-library.png');
  await evaluate(`playerDialog.close()`);

  await evaluate(`updateButton.click()`);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await capture('ui-update.png');
  await evaluate(`updateDialog.close()`);

  await command('Emulation.setDeviceMetricsOverride', {
    width: 900,
    height: 700,
    deviceScaleFactor: 1,
    mobile: false
  });
  const compact = await evaluate(`({
    viewport: [innerWidth, innerHeight],
    headerHeight: Math.round(document.querySelector('.app-header').getBoundingClientRect().height),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    firstCardWidth: Math.round(document.querySelector('#resource-list .media-card').getBoundingClientRect().width)
  })`);
  await capture('ui-compact.png');

  socket.close();
  process.stdout.write(`${JSON.stringify({ shell, keyboardDialogs, popupAttemptBlocked, playbackRecovery, detailLoading, episodePlayback, consumerState, hubs, compact }, null, 2)}\n`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
