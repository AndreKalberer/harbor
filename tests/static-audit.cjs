const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const catalog = JSON.parse(read(path.join('app', 'catalog.json')));
const appHtml = read(path.join('app', 'index.html'));
const appConfig = read(path.join('app', 'config.js'));
const renderer = read(path.join('app', 'renderer.js'));
const appStyles = read(path.join('app', 'styles.css'));
const main = read(path.join('electron', 'main.cjs'));
const preload = read(path.join('electron', 'preload.cjs'));
const landing = read('index.html');
const workflow = read(path.join('.github', 'workflows', 'build-desktop.yml'));
const tvHtml = read(path.join('tv', 'index.html'));
const tvConfig = read(path.join('tv', 'config.js'));
const tvScript = read(path.join('tv', 'tv.js'));
const tvStyles = read(path.join('tv', 'tv.css'));
const tvStage = read(path.join('scripts', 'stage-tv.cjs'));
const releasePackager = read(path.join('scripts', 'package-current-release.cjs'));
const seriesMetadata = read(path.join('shared', 'series-metadata.js'));
const liveTv = read(path.join('shared', 'live-tv.js'));
const watchBrowse = read(path.join('shared', 'watch-browse.js'));
const playbackProviders = read(path.join('shared', 'playback-providers.js'));
const userState = read(path.join('shared', 'user-state.js'));
const artworkCache = read(path.join('shared', 'artwork-cache.js'));
const releaseChannel = read(path.join('shared', 'release-channel.js'));
const lgManifest = JSON.parse(read(path.join('tv', 'lg', 'appinfo.json')));
const samsungManifest = read(path.join('tv', 'samsung', 'config.xml'));
const androidManifest = read(path.join('tv', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'));
const androidGradle = read(path.join('tv', 'android', 'app', 'build.gradle.kts'));
const desktopDetailFlow = renderer.slice(
  renderer.indexOf('const openDetailDialog'),
  renderer.indexOf('const renderEpisodeChips')
);

assert(/^2\.\d+\.\d+$/.test(packageJson.version), 'Harbor 2.x version is required.');
assert(packageLock.version === packageJson.version, 'package-lock version does not match package.json.');
assert(packageLock.packages?.['']?.version === packageJson.version, 'lockfile root version does not match package.json.');
assert(packageJson.build?.appId === 'com.harbor.desktop', 'The legacy HarborList app id is still configured.');
assert(packageJson.build?.productName === 'Harbor', 'Packaged product name must be Harbor.');
assert(packageJson.repository?.url === 'https://github.com/AndreKalberer/harbor.git', 'Release repository is not configured.');
assert(packageJson.dependencies?.['hls.js'], 'Live TV playback is missing its packaged HLS runtime.');
assert(packageJson.dependencies?.['electron-updater'], 'The installed desktop app is missing its one-click update runtime.');

assert(main.includes('contextIsolation: true'), 'Electron context isolation is not enabled.');
assert(main.includes('nodeIntegration: false'), 'Electron node integration is not disabled.');
assert(main.includes('sandbox: true'), 'Electron sandbox is not enabled.');
assert(main.includes("process.platform === 'win32') app.disableHardwareAcceleration()"), 'Windows startup does not guard against an unusable GPU process.');
assert(main.includes("window.webContents.once('did-finish-load', revealWindow)") && main.includes('window.center()'), 'The desktop window lacks a load-complete reveal fallback.');
assert(main.includes('app.requestSingleInstanceLock()') && main.includes("app.on('second-instance'") && main.includes('existingWindow.show()'), 'Repeated desktop launches do not restore the existing Harbor window.');
assert(main.includes("guestContents.setWindowOpenHandler(() => ({ action: 'deny' }))"), 'Embedded popup blocking is missing.');
assert(main.includes("streamingSession.on('will-download'"), 'Embedded download blocking is missing.');
assert(!appHtml.includes('allowpopups'), 'The app webview still grants popup permission.');
assert(appHtml.includes('Content-Security-Policy'), 'The app Content Security Policy is missing.');
assert(preload.includes('contextBridge.exposeInMainWorld'), 'The isolated Harbor bridge is missing.');
assert(preload.includes('getDirectoryLinks') && preload.includes('openDirectoryLink'), 'The desktop link directory bridge is missing.');
assert(preload.includes('exportUserData') && preload.includes('importUserData'), 'The desktop data backup bridge is missing.');
assert(preload.includes('checkForUpdates'), 'The desktop stable update check bridge is missing.');
assert(preload.includes('downloadUpdate') && preload.includes('installUpdate') && preload.includes('onUpdateState'), 'The isolated one-click update bridge is incomplete.');
assert(preload.includes('getDiagnostics') && preload.includes('copyDiagnostics') && preload.includes('openTrustedPage'), 'Desktop support and diagnostics bridges are missing.');
assert(main.includes("ipcMain.handle('harbor:get-directory-links'") && main.includes("ipcMain.handle('harbor:open-directory-link'"), 'The desktop link directory handlers are missing.');
assert(main.includes("ipcMain.handle('harbor:export-user-data'") && main.includes("ipcMain.handle('harbor:import-user-data'"), 'The desktop data backup handlers are missing.');
assert(main.includes("url.protocol !== 'https:'") && main.includes('readDirectoryLinks().find'), 'Desktop directory links are not restricted to known HTTPS catalog entries.');
assert(appHtml.includes('<script src="config.js"></script>'), 'Desktop build configuration is not loaded.');
assert(tvHtml.includes('<script src="config.js"></script>'), 'TV build configuration is not loaded.');
assert(appHtml.includes('../shared/series-metadata.js') && tvHtml.includes('../shared/series-metadata.js'), 'Shared episode metadata behavior is not loaded.');
assert(appHtml.includes('../shared/live-tv.js') && tvHtml.includes('../shared/live-tv.js'), 'Shared IPTV-org directory behavior is not loaded on both clients.');
assert(appHtml.includes('../shared/watch-browse.js') && tvHtml.includes('../shared/watch-browse.js'), 'Shared Watch subcategories are not loaded on both clients.');
assert(appHtml.includes('../shared/playback-providers.js'), 'Desktop playback provider registry is not loaded.');
assert(appHtml.includes('../shared/user-state.js'), 'Desktop user-state migration layer is not loaded.');
assert(appHtml.includes('../shared/artwork-cache.js') && appHtml.includes('harbor-artwork:'), 'Desktop artwork caching is not loaded or allowed by CSP.');
assert(appHtml.includes('catalog-data.js') && renderer.includes('window.HarborCatalogData'), 'Desktop catalog is not loaded from its dedicated data module.');
assert(appHtml.includes('id="welcome-dialog"') && appHtml.includes('id="welcome-start-button"'), 'Desktop first-run welcome guide is missing.');
assert(main.includes("require('../shared/playback-providers.js')") && main.includes('playbackProviders.allowedHosts'), 'Electron stream navigation does not use the shared provider allowlist.');
for (const provider of ['vidlink', 'vidsrc', 'autoembed', 'superembed']) {
  assert(playbackProviders.includes(`id: '${provider}'`), `Shared playback registry is missing ${provider}.`);
}
assert(userState.includes("CURRENT_KEY = 'harbor:user-state:v2'") && userState.includes("'harbor:user-state:v1'"), 'Desktop user state is not migrated from v1 to v2.');
assert(userState.includes('RECOVERY_KEY') && userState.includes('writeRecovery'), 'Unreadable desktop user state is not retained for recovery.');
assert(userState.includes('createBackup') && userState.includes('parseBackup'), 'Portable desktop backup validation is missing.');
assert(artworkCache.includes("host === 'image.tmdb.org'") && artworkCache.includes('toCacheUrl'), 'Trusted catalog artwork routing is missing.');
assert(main.includes("protocol.handle('harbor-artwork'") && main.includes('artworkCacheMaxTotalBytes'), 'The bounded desktop artwork cache is missing.');
assert(releaseChannel.includes("channel: 'stable'") && releaseChannel.includes('compareVersions'), 'Stable release-channel comparison is missing.');
assert(main.includes("ipcMain.handle('harbor:check-for-updates'") && main.includes('latestReleaseApiUrl'), 'Official update discovery is missing.');
assert(main.includes("require('electron-updater')") && main.includes('autoUpdater.autoDownload = false'), 'Desktop updates are not user-controlled through electron-updater.');
assert(main.includes("ipcMain.handle('harbor:download-update'") && main.includes("ipcMain.handle('harbor:install-update'") && main.includes('quitAndInstall(false, true)'), 'One-click download or restart-to-install is missing.');
assert(appHtml.includes('id="update-action-button"') && appHtml.includes('id="update-progress"'), 'The update dialog is missing its download action or progress meter.');
assert(renderer.includes("'Download update'") && renderer.includes("'Restart and install'"), 'The desktop update UI does not expose download and install states.');
assert(main.includes("ipcMain.handle('harbor:get-diagnostics'") && main.includes("support: 'https://github.com/AndreKalberer/harbor/issues'"), 'Safe diagnostics or support routing is missing.');
assert(appHtml.includes('This product uses the TMDB API but is not endorsed or certified by TMDB.'), 'Required TMDB attribution notice is missing.');
assert(appHtml.includes('id="update-title" tabindex="-1"') && renderer.includes('updateTitle.focus({ preventScroll: true })'), 'About dialog initial focus can scroll past its heading.');
assert(appHtml.includes('id="provider-disclosure"') && renderer.includes('playbackProvidersApi.providers.map'), 'Configured playback providers are not disclosed in About.');
assert(renderer.includes('onboardingComplete') && renderer.includes("welcomeDialog.addEventListener('close'"), 'Desktop onboarding completion is not persisted.');
assert(appHtml.includes('role="tablist"') && appHtml.includes('role="tabpanel"'), 'My Harbor settings navigation does not expose tab semantics.');
assert(renderer.includes("['ArrowLeft', 'ArrowRight', 'Home', 'End']") && renderer.includes("button.setAttribute('aria-selected'"), 'My Harbor tabs do not support standard keyboard navigation.');
assert(renderer.includes("myHarborDialog.addEventListener('close'") && renderer.includes('myHarborReturnFocus.focus()'), 'My Harbor does not restore keyboard focus when it closes.');
assert(appHtml.includes('hls.js/dist/hls.min.js') && tvHtml.includes('hls.js/dist/hls.min.js'), 'HLS playback is not loaded on both clients.');
assert(renderer.includes('window.HARBOR_CONFIG?.tmdbApiKey'), 'Desktop catalog access is not using build configuration.');
assert(tvScript.includes('window.HARBOR_CONFIG.tmdbApiKey'), 'TV catalog access is not using build configuration.');
assert(!/const\s+TMDB_(?:API_)?KEY\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/.test(renderer + tvScript), 'A catalog credential is hardcoded in public source.');
assert(appConfig.includes('tmdbApiKey:') && tvConfig.includes('tmdbApiKey:'), 'Catalog build configuration is missing.');

for (const feature of ['USER_STATE_KEY', 'toggleFavorite', 'recordHistory', 'recordProgress', 'tryNextStreamRoute']) {
  assert(renderer.includes(feature), `Consumer feature is missing: ${feature}`);
}
assert(seriesMetadata.includes('normalizeSeriesSeasons') && seriesMetadata.includes('stepSelection'), 'Authoritative episode navigation helpers are missing.');
for (const section of ['Movies', 'TV Shows', 'Anime', 'Sports', 'Live TV']) {
  assert(watchBrowse.includes(section), `Shared Watch filters are missing ${section}.`);
}
assert(watchBrowse.includes('loadLiveChannels') && watchBrowse.includes('parseM3u'), 'Playable Sports and Live TV catalogs are missing.');
assert(watchBrowse.includes("id: 'robot-games'") && watchBrowse.includes('loadFreeEventDirectory'), 'Official free Robot Games coverage is missing.');
assert(watchBrowse.includes("playlistCategory: 'science'") && watchBrowse.includes("playlistCategory: 'travel'"), 'The remaining safe public Live TV categories are not exposed.');
for (const protection of ['blocklist.json', 'supportedStreamType', 'markStreamFailure', 'isQuarantined', 'loadGuide']) {
  assert(liveTv.includes(protection), `Live-channel protection is missing: ${protection}`);
}
assert(appHtml.includes('id="live-country-select"') && appHtml.includes('id="live-language-select"'), 'Desktop live country/language filters are missing.');
assert(appHtml.includes('id="live-now-button"') && appHtml.includes('id="live-soon-button"') && renderer.includes('loadLiveWindowDirectory'), 'Desktop browse-level Live Now or Live Soon is missing.');
assert(renderer.includes('loadLiveGuide') && renderer.includes('tryNextLiveStream'), 'Desktop live guide or alternate-stream recovery is missing.');
assert(renderer.includes('seriesMetadataApi.normalizeSeriesSeasons'), 'Desktop series details do not use canonical season metadata.');
assert(!renderer.includes('renderEpisodeChips(24)'), 'Desktop still fabricates 24 episodes for every season.');
assert(!renderer.includes('episodesPerSeason') && !renderer.includes('seasonsCount'), 'Desktop catalog still carries fabricated series counts.');
assert(appHtml.includes('id="detail-play-btn"') && desktopDetailFlow.includes("const isLive = item.type === 'live'") && desktopDetailFlow.includes('detailPlayBtn.hidden = isSeries') && desktopDetailFlow.includes("detailPlayBtn.textContent = isLive ? '▶ Watch live' : '▶ Watch'"), 'Desktop detail actions do not distinguish movies, live playback, and series episode actions.');
assert(renderer.includes('startStreamPlayback(activeMedia, activeSeason, activeEpisode);'), 'Desktop episode buttons do not start playback directly.');
assert(desktopDetailFlow.indexOf('mediaDetailDialog.showModal()') < desktopDetailFlow.indexOf('activeSeriesSeasons = await fetchTvShowDetails'), 'Desktop series details do not expose their loading state immediately.');
assert(renderer.includes("failures.add(provider.key)") && renderer.includes('partial results'), 'Desktop search does not disclose partial provider failures.');
assert(renderer.includes('detailSeasonRow.hidden = !activeSeriesSeasons.length'), 'Desktop leaves an empty season selector visible when metadata is unavailable.');
assert(renderer.includes('updateDialog.close()') && renderer.includes('updateReturnFocus.focus()'), 'About and updates does not close with Escape and restore focus.');
assert(appStyles.includes('.header-search:focus-within') && appStyles.includes('outline: 2px solid var(--focus)'), 'Header search does not expose a visible keyboard focus treatment.');
assert(renderer.includes('directoryLinkCatalog') && renderer.includes('item.externalUrl'), 'Listen, Read, and Play do not render as external-link directories.');
assert(renderer.includes("if (provider.category !== 'Watch') return false;"), 'Desktop link sections still query media providers instead of their directory links.');
for (const section of ['Watch', 'Listen', 'Read', 'Play']) {
  assert(renderer.includes(section), `Catalog section is missing: ${section}`);
}
assert(Array.isArray(catalog.items) && catalog.items.length > 25, 'Catalog seed data is unexpectedly small.');

for (const platform of ['Windows', 'macOS', 'Linux', 'TV']) {
  assert(landing.includes(`Download for ${platform}`), `Landing page is missing ${platform}.`);
}
assert(landing.includes('https://github.com/AndreKalberer/harbor/releases/latest'), 'Landing page does not use the official release URL.');
assert(!workflow.includes('HarborList-'), 'Legacy HarborList artifact names remain in CI.');
assert(workflow.includes('npm run test:desktop-smoke') && workflow.includes("runner.os == 'Windows'"), 'CI does not run the isolated desktop consumer smoke suite.');
assert(workflow.includes('npm run test:packaged-smoke'), 'CI does not smoke-test the packaged Windows app before upload.');
assert(workflow.includes('run: npm run test:tv-smoke'), 'CI does not run the isolated TV remote-navigation smoke suite.');
assert(packageJson.scripts?.['test:all'] === 'npm run test:consumer && npm run test:tv-smoke', 'The complete consumer-readiness test command is missing.');
assert(workflow.includes('WIN_CSC_LINK') && workflow.includes('MAC_CSC_LINK'), 'Platform-specific desktop signing credentials are not configured.');
assert(workflow.includes('--repo "${GITHUB_REPOSITORY}"'), 'Tagged release publishing lacks explicit GitHub repository context.');
assert(!workflow.includes('release/*.yml'), 'Debug builder metadata would be uploaded as a public release asset.');
for (const artifact of ['Harbor-Windows', 'Harbor-Linux', 'Harbor-macOS', 'SHA256SUMS.txt']) {
  assert(workflow.includes(artifact), `Release workflow is missing ${artifact}.`);
}
assert(!tvHtml.includes('sandbox='), 'TV player still uses an iframe sandbox that its playback providers reject.');
assert(tvHtml.includes('class="tv-nav"') && tvHtml.includes('data-section="Home"') && tvHtml.includes('data-section="Watch"') && tvHtml.includes('data-section="Listen"') && tvHtml.includes('data-action="watch"'), 'The TV top-level Home, Watch, and Listen navigation is incomplete.');
assert(tvHtml.includes('id="watch-filter-row"'), 'TV Watch subcategory filters are missing.');
assert(tvHtml.includes('id="live-country-select"') && tvHtml.includes('id="live-language-select"'), 'TV live country/language filters are missing.');
assert(!tvHtml.includes('allow-popups'), 'TV player grants popup permission.');
assert(tvHtml.includes('id="tv-frame" class="player-frame focusable"') && tvHtml.includes('tabindex="0"'), 'TV player is not reachable with a 5-way remote.');
assert(tvScript.includes('function focusPlayerFrame()') && tvScript.includes('tvFrame.contentWindow.focus()'), 'TV player does not hand remote focus to the embedded controls.');
assert(tvScript.includes('function revealPlayerControls(route)') && tvScript.includes('if (route) revealPlayerControls(route);'), 'TV player controls stay covered while waiting for autoplay.');
assert(tvScript.includes("playerEvent === 'play' || playerEvent === 'timeupdate'"), 'TV player hides its loading screen before playback is proven ready.');
assert(!tvScript.includes("event.data.type === 'MEDIA_DATA' ||"), 'TV player still treats catalog metadata as playback readiness.');
assert(tvScript.includes('autoplay=true'), 'TV playback does not start immediately after an episode is selected.');
assert(tvScript.includes('https://vidsrc.to/embed/'), 'TV playback has no secure fallback provider.');
assert(tvScript.includes('The secure playback providers did not start.'), 'TV player failure text does not describe the actual failure.');
assert(tvScript.includes('}, 18000);'), 'TV playback routes do not get enough time to start on television hardware.');
for (const feature of ['moveFocus', 'fetchWatch', 'toggleSaved']) {
  assert(tvScript.includes(feature), `TV consumer feature is missing: ${feature}`);
}
for (const feature of ['fetchSeriesMetadata', 'renderEpisodeBrowser', 'loadPlayerRoute', 'playerRetry']) {
  assert(tvScript.includes(feature), `TV series/player behavior is missing: ${feature}`);
}
assert(!tvScript.includes("'/1/1'"), 'TV playback is still hardcoded to season 1 episode 1.');
assert(tvScript.includes('No titles found'), 'TV zero-result searches do not have an empty state.');
assert(tvScript.includes('loadLiveGuide') && tvScript.includes('tryNextLiveStream'), 'TV live guide or alternate-stream recovery is missing.');
assert(tvHtml.includes('id="live-now-button"') && tvHtml.includes('id="live-soon-button"') && tvScript.includes('loadLiveWindowDirectory'), 'TV browse-level Live Now or Live Soon is missing.');
assert(tvScript.includes('detailPlay.hidden = isSeries') && tvScript.includes('openPlayer(state.active);'), 'TV episode buttons do not start playback directly.');
assert(tvScript.includes("current === searchInput && (direction === 'right' || direction === 'down')") && tvScript.includes("document.activeElement === searchInput"), 'TV search cannot be reached and submitted through the remote path.');
assert(tvScript.includes("current.classList.contains('media-card') && !candidate.classList.contains('media-card')") && tvStyles.includes('scroll-behavior: auto'), 'TV horizontal focus can escape its card row or lag behind smooth page scrolling.');
assert(tvScript.includes('artFallback.hidden = true') && tvScript.includes("card.setAttribute('aria-label'"), 'TV poster fallbacks or card accessible names are not normalized.');
assert(tvScript.includes("typeof XMLHttpRequest === 'function'") && tvScript.includes('request.ontimeout'), 'Legacy webOS requests do not use an aborting timeout.');
for (const keyCode of ['code === 37', 'code === 38', 'code === 39', 'code === 40']) {
  assert(tvScript.includes(keyCode), `TV remote direction support is missing: ${keyCode}`);
}
assert(tvStyles.includes('.focusable:focus'), 'Legacy webOS focus styling is missing.');
assert(tvStyles.includes('outline: none') && tvStyles.includes('0 0 0 5px #9a6dff'), 'TV focus styling is not a single purple outline.');
assert(!tvStyles.includes('outline: 6px solid #fff'), 'TV focus styling still draws the white rectangle.');
assert(tvStyles.includes('font-size: 82px'), 'Legacy webOS heading fallback is missing.');
assert(tvStage.includes("assets', 'tv-icon.png"), 'TV packaging does not use the full-bleed icon.');
for (const file of ['config.js', 'tv.css', 'tv.js']) {
  assert(tvStage.includes(`'${file}'`), `The self-contained LG package is missing ${file}.`);
}
assert(tvStage.includes("'nonce-${lgNonce}'"), 'The LG bundle does not preserve CSP protection for inline assets.');
assert(tvStage.includes("shared', 'series-metadata.js"), 'The LG bundle does not include episode metadata behavior.');
assert(tvStage.includes("shared', 'live-tv.js") && tvStage.includes("shared', 'watch-browse.js") && tvStage.includes("'hls.js', 'dist', 'hls.min.js'"), 'TV packages do not include the live directory, Watch filters, and HLS playback.');
assert(releasePackager.includes("directoryName.startsWith('.desktop-test-profile')"), 'Release source archives do not exclude local packaged-QA profiles.');
assert(lgManifest.id === 'com.harbor.tv' && lgManifest.version === packageJson.version, 'LG webOS manifest is out of sync.');
assert(samsungManifest.includes('tizen:profile name="tv-samsung"'), 'Samsung TV profile is missing.');
for (const origin of ['api.themoviedb.org', 'image.tmdb.org', 'itunes.apple.com', 'openlibrary.org', 'vidlink.pro']) {
  assert(samsungManifest.includes(origin), `Samsung network access is missing ${origin}.`);
}
assert(samsungManifest.includes('iptv-org.github.io'), 'Samsung network access is missing the public live catalog.');
for (const origin of ['api.cgtn.com', 'news.cgtn.com', 'live-stream.cgtn.com', 'envod.cgtn.com']) {
  assert(samsungManifest.includes(origin), `Samsung network access is missing official free-event host ${origin}.`);
}
assert(androidManifest.includes('android.intent.category.LEANBACK_LAUNCHER'), 'Android TV launcher support is missing.');
assert(androidGradle.includes('file("../../build/android-assets")'), 'Android bundle assets path is incorrect.');
assert(androidGradle.includes('androidx.webkit:webkit') && read(path.join('tv', 'android', 'app', 'src', 'main', 'java', 'com', 'harbor', 'tv', 'MainActivity.java')).includes('WebViewAssetLoader'), 'Android TV does not use the secure app-assets origin.');
assert(workflow.includes('Harbor-TV-LG-webOS') && workflow.includes('Harbor-TV-Android-Fire'), 'TV release downloads are missing from CI.');
assert((workflow.match(/configure-build\.cjs --tv --require/g) || []).length >= 2, 'TV releases and Pages are not configured for the full catalog.');

process.stdout.write(JSON.stringify({
  version: packageJson.version,
  appId: packageJson.build.appId,
  catalogResources: catalog.items.length,
  security: 'isolated, sandboxed, popup and download blocked',
  releases: ['Windows', 'macOS', 'Linux', 'LG webOS', 'Android/Fire TV', 'Samsung source', 'checksums', 'Pages']
}, null, 2) + '\n');
