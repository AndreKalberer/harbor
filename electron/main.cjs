const { app, BrowserWindow, clipboard, dialog, ipcMain, net, protocol, shell, session } = require('electron');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const playbackProviders = require('../shared/playback-providers.js');
const userStateApi = require('../shared/user-state.js');
const artworkCacheApi = require('../shared/artwork-cache.js');
const releaseChannelApi = require('../shared/release-channel.js');
const { autoUpdater } = require('electron-updater');

if (process.platform === 'win32') app.disableHardwareAcceleration();

protocol.registerSchemesAsPrivileged([{
  scheme: 'harbor-artwork',
  privileges: { secure: true, standard: true, supportFetchAPI: false, stream: true }
}]);

const gameLaunchTokens = new Map();
const publicReleaseUrl = 'https://github.com/AndreKalberer/harbor/releases/latest';
const latestReleaseApiUrl = 'https://api.github.com/repos/AndreKalberer/harbor/releases/latest';
const trustedExternalPages = Object.freeze({
  support: 'https://github.com/AndreKalberer/harbor/issues',
  tmdb: 'https://www.themoviedb.org'
});
const allowedStreamHosts = new Set(playbackProviders.allowedHosts);
const directoryCategories = new Set(['Listen', 'Read', 'Play']);
const userDataBackupMaxBytes = 2 * 1024 * 1024;
const artworkCacheMaxFileBytes = 8 * 1024 * 1024;
const artworkCacheMaxTotalBytes = 100 * 1024 * 1024;
const updateCheckCacheTtlMs = 15 * 60 * 1000;
let cachedUpdateCheck = null;
let updaterState = { status: 'idle', currentVersion: app.getVersion(), percent: 0 };
let updateDownloadPromise = null;

const publicUpdaterState = (value = updaterState) => ({
  status: value.status,
  currentVersion: value.currentVersion || app.getVersion(),
  latestVersion: value.latestVersion || '',
  percent: Number.isFinite(value.percent) ? Math.max(0, Math.min(100, Math.round(value.percent))) : 0,
  message: value.message || ''
});

const publishUpdaterState = (next) => {
  updaterState = Object.assign({}, updaterState, next);
  const state = publicUpdaterState();
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('harbor:update-state', state);
  }
  return state;
};

const configureAutoUpdater = () => {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('checking-for-update', () => publishUpdaterState({ status: 'checking', message: 'Checking for an official Harbor update…' }));
  autoUpdater.on('update-available', (info) => publishUpdaterState({ status: 'available', latestVersion: String(info?.version || ''), percent: 0, message: '' }));
  autoUpdater.on('update-not-available', () => publishUpdaterState({ status: 'current', latestVersion: '', percent: 0, message: '' }));
  autoUpdater.on('download-progress', (progress) => publishUpdaterState({ status: 'downloading', percent: Number(progress?.percent) || 0, message: '' }));
  autoUpdater.on('update-downloaded', (info) => publishUpdaterState({ status: 'downloaded', latestVersion: String(info?.version || updaterState.latestVersion || ''), percent: 100, message: '' }));
  autoUpdater.on('error', () => publishUpdaterState({ status: 'error', message: 'Harbor could not download the update. Check your connection or use Open downloads.' }));
};

const downloadOfficialUpdate = async () => {
  if (!app.isPackaged) return publishUpdaterState({ status: 'unavailable', message: 'One-click updates are available in the installed Harbor app.' });
  if (updaterState.status === 'downloaded') return publicUpdaterState();
  if (updateDownloadPromise) return updateDownloadPromise;
  updateDownloadPromise = (async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (!result?.updateInfo || releaseChannelApi.compareVersions(app.getVersion(), result.updateInfo.version) !== -1) {
        return publishUpdaterState({ status: 'current', latestVersion: '', percent: 0, message: '' });
      }
      publishUpdaterState({ status: 'downloading', latestVersion: String(result.updateInfo.version || ''), percent: 0, message: '' });
      await autoUpdater.downloadUpdate();
      return publicUpdaterState();
    } catch {
      return publishUpdaterState({ status: 'error', message: 'Harbor could not download the update. Check your connection or use Open downloads.' });
    } finally {
      updateDownloadPromise = null;
    }
  })();
  return updateDownloadPromise;
};

const artworkCacheDirectory = () => path.join(app.getPath('userData'), 'artwork-cache');

const pruneArtworkCache = () => {
  const directory = artworkCacheDirectory();
  try {
    const entries = fs.readdirSync(directory)
      .filter((name) => name.endsWith('.bin'))
      .map((name) => {
        const filePath = path.join(directory, name);
        const stats = fs.statSync(filePath);
        return { filePath, metadataPath: filePath.slice(0, -4) + '.json', size: stats.size, modified: stats.mtimeMs };
      })
      .sort((left, right) => left.modified - right.modified);
    let total = entries.reduce((sum, entry) => sum + entry.size, 0);
    while (total > artworkCacheMaxTotalBytes && entries.length) {
      const entry = entries.shift();
      fs.rmSync(entry.filePath, { force: true });
      fs.rmSync(entry.metadataPath, { force: true });
      total -= entry.size;
    }
  } catch {
    // Artwork caching is optional and never prevents Harbor from starting.
  }
};

const artworkResponse = async (request) => {
  const source = artworkCacheApi.fromCacheUrl(request.url);
  if (!source) return new Response('Invalid artwork source.', { status: 400 });
  const key = createHash('sha256').update(source).digest('hex');
  const directory = artworkCacheDirectory();
  const dataPath = path.join(directory, key + '.bin');
  const metadataPath = path.join(directory, key + '.json');
  try {
    if (fs.existsSync(dataPath) && fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      if (typeof metadata.contentType === 'string' && metadata.contentType.startsWith('image/')) {
        const now = new Date();
        fs.utimesSync(dataPath, now, now);
        return new Response(fs.readFileSync(dataPath), {
          headers: { 'content-type': metadata.contentType, 'cache-control': 'public, max-age=31536000, immutable' }
        });
      }
    }

    const response = await net.fetch(source, { redirect: 'follow' });
    const responseSource = artworkCacheApi.normalizeSource(response.url);
    const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (!response.ok || !responseSource || !contentType.startsWith('image/') || contentLength > artworkCacheMaxFileBytes) {
      return new Response('Artwork unavailable.', { status: 404 });
    }
    const content = Buffer.from(await response.arrayBuffer());
    if (!content.length || content.length > artworkCacheMaxFileBytes) return new Response('Artwork unavailable.', { status: 404 });
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(dataPath, content, { mode: 0o600 });
    fs.writeFileSync(metadataPath, JSON.stringify({ source, contentType }), { encoding: 'utf8', mode: 0o600 });
    pruneArtworkCache();
    return new Response(content, {
      headers: { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable' }
    });
  } catch {
    return new Response('Artwork unavailable.', { status: 404 });
  }
};

const checkForStableUpdate = async () => {
  if (cachedUpdateCheck && Date.now() - cachedUpdateCheck.checkedAt < updateCheckCacheTtlMs) {
    return cachedUpdateCheck.result;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await net.fetch(latestReleaseApiUrl, {
      signal: controller.signal,
      headers: { accept: 'application/vnd.github+json', 'user-agent': `Harbor/${app.getVersion()}` }
    });
    if (!response.ok) throw new Error('Release service unavailable.');
    const raw = await response.text();
    if (raw.length > 1024 * 1024) throw new Error('Release response is too large.');
    const latest = releaseChannelApi.normalizeLatestRelease(JSON.parse(raw));
    if (!latest) throw new Error('No stable Harbor release was found.');
    const currentVersion = app.getVersion();
    const comparison = releaseChannelApi.compareVersions(currentVersion, latest.version);
    const result = {
      status: 'checked',
      channel: releaseChannelApi.channel,
      currentVersion,
      latestVersion: latest.version,
      publishedAt: latest.publishedAt,
      updateAvailable: comparison === -1
    };
    cachedUpdateCheck = { checkedAt: Date.now(), result };
    return result;
  } catch {
    return {
      status: 'unavailable',
      channel: releaseChannelApi.channel,
      currentVersion: app.getVersion(),
      message: 'Harbor could not check for updates. You can still open the official downloads page.'
    };
  } finally {
    clearTimeout(timeout);
  }
};

const diagnostics = () => ({
  appVersion: app.getVersion(),
  channel: releaseChannelApi.channel,
  platform: process.platform,
  architecture: process.arch,
  osRelease: os.release(),
  electronVersion: process.versions.electron,
  chromeVersion: process.versions.chrome
});

const diagnosticsText = () => {
  const details = diagnostics();
  return [
    `Harbor ${details.appVersion} (${details.channel})`,
    `${details.platform} ${details.osRelease} (${details.architecture})`,
    `Electron ${details.electronVersion}`,
    `Chrome ${details.chromeVersion}`
  ].join('\n');
};

const readDirectoryLinks = () => {
  try {
    const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app', 'catalog.json'), 'utf8'));
    return (Array.isArray(catalog.items) ? catalog.items : []).flatMap((item) => {
      if (!item || !directoryCategories.has(item.category) || typeof item.name !== 'string') return [];
      try {
        const url = new URL(item.url);
        if (url.protocol !== 'https:') return [];
        return [{
          name: item.name,
          domain: typeof item.domain === 'string' ? item.domain : url.hostname,
          category: item.category,
          sections: Array.isArray(item.sections) ? item.sections.filter((section) => typeof section === 'string') : [],
          url: url.href
        }];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
};

const isAllowedStreamUrl = (candidate) => {
  if (candidate === 'about:blank') return true;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && allowedStreamHosts.has(url.hostname);
  } catch {
    return false;
  }
};

const savedGameLibraryPath = () => path.join(app.getPath('userData'), 'game-library.json');

const readSavedGameLibrary = () => {
  try {
    const entries = JSON.parse(fs.readFileSync(savedGameLibraryPath(), 'utf8'));
    return Array.isArray(entries)
      ? entries.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.path === 'string')
      : [];
  } catch {
    return [];
  }
};

const writeSavedGameLibrary = (entries) => {
  const filePath = savedGameLibraryPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = filePath + '.tmp';
  fs.writeFileSync(temporaryPath, JSON.stringify(entries, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporaryPath, filePath);
};

const gameLibrarySummary = (entry) => ({
  id: entry.id,
  name: entry.name,
  addedAt: entry.addedAt
});

const releasePattern = {
  win32: /^Harbor-Setup-\d+\.\d+\.\d+-Windows-(x64|arm64)\.exe$/i,
  darwin: /^Harbor-\d+\.\d+\.\d+-macOS-(x64|arm64|universal)\.(dmg|zip)$/i,
  linux: /^Harbor-\d+\.\d+\.\d+-Linux-(x64|arm64)\.(AppImage|tar\.gz)$/i
};

const releaseFilters = {
  win32: [{ name: 'Harbor installer', extensions: ['exe'] }],
  darwin: [{ name: 'Harbor release', extensions: ['dmg', 'zip'] }],
  linux: [{ name: 'Harbor release', extensions: ['AppImage', 'gz'] }]
};

const gameFilters = {
  win32: [{ name: 'Windows games', extensions: ['exe'] }],
  darwin: [{ name: 'macOS applications', extensions: ['app'] }],
  linux: [{ name: 'Linux games', extensions: ['AppImage', 'bin', 'sh'] }]
};

const isAllowedGamePath = (candidate) => {
  const extension = path.extname(candidate).toLowerCase();
  if (process.platform === 'win32') return extension === '.exe';
  if (process.platform === 'darwin') return extension === '.app';
  if (process.platform === 'linux') return ['.appimage', '.bin', '.sh'].includes(extension);
  return false;
};

const sha256File = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = fs.createReadStream(filePath);
  stream.on('error', reject);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('end', () => resolve(hash.digest('hex')));
});

const verifyOfficialRelease = async (candidate) => {
  const fileName = path.basename(candidate);
  const version = fileName.match(/\d+\.\d+\.\d+/)?.[0];
  if (!version) return false;
  const response = await net.fetch(`https://github.com/AndreKalberer/harbor/releases/download/v${version}/SHA256SUMS.txt`);
  if (!response.ok) return false;
  const expectedLine = (await response.text()).split(/\r?\n/).find((line) => line.trim().endsWith(`  ${fileName}`));
  if (!expectedLine) return false;
  const expected = expectedLine.trim().split(/\s+/)[0].toLowerCase();
  return expected === await sha256File(candidate);
};

const ensureWindowsShortcuts = () => {
  if (process.platform !== 'win32' || !app.isPackaged || process.env.PORTABLE_EXECUTABLE_FILE) return;

  const installDirectory = path.dirname(process.execPath);
  const installedProfileMatch = installDirectory.match(/^(.+)[\\/]AppData[\\/]Local[\\/]Programs[\\/][^\\/]+$/i);
  const installedProfile = installedProfileMatch?.[1] || null;
  const desktopDirectory = installedProfile
    ? path.join(installedProfile, 'Desktop')
    : app.getPath('desktop');
  const startMenuDirectory = installedProfile
    ? path.join(installedProfile, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs')
    : path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');

  const shortcutDetails = {
    target: process.execPath,
    cwd: path.dirname(process.execPath),
    description: 'Harbor',
    icon: process.execPath,
    iconIndex: 0,
    appUserModelId: 'com.harbor.desktop'
  };

  const shortcutPaths = [
    path.join(desktopDirectory, 'Harbor.lnk'),
    path.join(startMenuDirectory, 'Harbor.lnk')
  ];

  const legacyShortcutPaths = [
    path.join(desktopDirectory, 'HarborList.lnk'),
    path.join(startMenuDirectory, 'HarborList.lnk')
  ];

  for (const shortcutPath of legacyShortcutPaths) {
    try {
      if (fs.existsSync(shortcutPath)) fs.unlinkSync(shortcutPath);
    } catch (error) {
      console.warn(`Could not remove legacy shortcut at ${shortcutPath}:`, error);
    }
  }

  for (const shortcutPath of shortcutPaths) {
    try {
      fs.mkdirSync(path.dirname(shortcutPath), { recursive: true });
      shell.writeShortcutLink(shortcutPath, 'replace', shortcutDetails);
    } catch (error) {
      console.warn(`Could not repair Harbor shortcut at ${shortcutPath}:`, error);
    }
  }
};

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 860,
    minHeight: 620,
    title: 'Harbor',
    backgroundColor: '#f2f0e9',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault();
    }
  });

  window.webContents.on('will-attach-webview', (event, webPreferences) => {
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
  });

  window.webContents.on('did-attach-webview', (_event, guestContents) => {
    guestContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    const keepInsidePlayer = (event, url) => {
      if (!isAllowedStreamUrl(url)) event.preventDefault();
    };
    guestContents.on('will-navigate', keepInsidePlayer);
    guestContents.on('will-redirect', keepInsidePlayer);
  });

  let revealed = false;
  let revealTimer = null;
  const revealWindow = () => {
    if (revealed || window.isDestroyed() || process.env.HARBOR_QA_SHOW === '0') return;
    revealed = true;
    if (revealTimer) clearTimeout(revealTimer);
    window.center();
    window.show();
    window.focus();
  };
  window.once('ready-to-show', revealWindow);
  window.webContents.once('did-finish-load', revealWindow);
  revealTimer = setTimeout(revealWindow, 5000);
  revealTimer.unref();
  window.once('closed', () => {
    if (revealTimer) clearTimeout(revealTimer);
  });
  void window.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
};

app.setAboutPanelOptions({
  applicationName: 'Harbor',
  applicationVersion: app.getVersion(),
  copyright: 'Your entertainment, in one place.'
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const existingWindow = BrowserWindow.getAllWindows()[0];
    if (!existingWindow || existingWindow.isDestroyed()) return;
    if (existingWindow.isMinimized()) existingWindow.restore();
    existingWindow.show();
    existingWindow.focus();
  });

app.whenReady().then(() => {
  app.setAppUserModelId('com.harbor.desktop');
  configureAutoUpdater();
  ensureWindowsShortcuts();
  pruneArtworkCache();
  protocol.handle('harbor-artwork', artworkResponse);

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'fullscreen';
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'fullscreen');
  });

  const streamingSession = session.fromPartition('persist:harbor');
  streamingSession.setPermissionCheckHandler((_webContents, permission) => (
    permission === 'fullscreen'
  ));
  streamingSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'fullscreen');
  });
  streamingSession.on('will-download', (event) => event.preventDefault());

  ipcMain.handle('harbor:get-version', () => app.getVersion());
  ipcMain.handle('harbor:get-diagnostics', diagnostics);
  ipcMain.handle('harbor:copy-diagnostics', () => {
    clipboard.writeText(diagnosticsText());
    return { status: 'copied' };
  });
  ipcMain.handle('harbor:open-trusted-page', async (_event, page) => {
    const target = trustedExternalPages[page];
    if (!target) return { status: 'invalid' };
    await shell.openExternal(target);
    return { status: 'opened' };
  });
  ipcMain.handle('harbor:check-for-updates', checkForStableUpdate);
  ipcMain.handle('harbor:get-update-state', () => publicUpdaterState());
  ipcMain.handle('harbor:download-update', downloadOfficialUpdate);
  ipcMain.handle('harbor:install-update', () => {
    if (updaterState.status !== 'downloaded') return { status: 'not-ready' };
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return { status: 'installing' };
  });
  ipcMain.handle('harbor:get-directory-links', () => readDirectoryLinks());
  ipcMain.handle('harbor:open-directory-link', async (_event, candidate) => {
    if (typeof candidate !== 'string') return { status: 'invalid' };
    const link = readDirectoryLinks().find((entry) => entry.url === candidate);
    if (!link) return { status: 'invalid' };
    await shell.openExternal(link.url);
    return { status: 'opened' };
  });
  ipcMain.handle('harbor:open-release-page', async () => {
    await shell.openExternal(publicReleaseUrl);
    return { status: 'opened' };
  });
  ipcMain.handle('harbor:export-user-data', async (event, value) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const date = new Date().toISOString().slice(0, 10);
    const result = await dialog.showSaveDialog(owner, {
      title: 'Back up Harbor data',
      defaultPath: path.join(app.getPath('documents'), `Harbor-data-${date}.json`),
      filters: [{ name: 'Harbor data backup', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { status: 'cancelled' };
    try {
      const document = userStateApi.createBackup(value, app.getVersion());
      fs.writeFileSync(result.filePath, JSON.stringify(document, null, 2), { encoding: 'utf8', mode: 0o600 });
      return { status: 'saved', fileName: path.basename(result.filePath) };
    } catch {
      return { status: 'error', message: 'Harbor could not save the backup file.' };
    }
  });
  ipcMain.handle('harbor:import-user-data', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: 'Restore Harbor data',
      defaultPath: app.getPath('documents'),
      properties: ['openFile'],
      filters: [{ name: 'Harbor data backup', extensions: ['json'] }]
    });
    if (result.canceled || result.filePaths.length !== 1) return { status: 'cancelled' };
    const filePath = result.filePaths[0];
    try {
      const stats = fs.statSync(filePath);
      if (!stats.isFile() || stats.size > userDataBackupMaxBytes) {
        return { status: 'invalid', message: 'Choose a Harbor data backup smaller than 2 MB.' };
      }
      const state = userStateApi.parseBackup(fs.readFileSync(filePath, 'utf8'));
      return { status: 'ready', fileName: path.basename(filePath), state };
    } catch {
      return { status: 'invalid', message: 'That file is not a valid Harbor data backup.' };
    }
  });
  ipcMain.handle('harbor:choose-game', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: 'Add an installed game',
      defaultPath: app.getPath('home'),
      properties: ['openFile'],
      filters: gameFilters[process.platform] || [{ name: 'Applications', extensions: ['*'] }]
    });

    if (result.canceled || result.filePaths.length !== 1) return { status: 'cancelled' };

    const candidate = path.resolve(result.filePaths[0]);
    if (!isAllowedGamePath(candidate) || !fs.existsSync(candidate)) {
      return { status: 'invalid', message: 'Choose an installed game application for this operating system.' };
    }

    let stats;
    try {
      stats = fs.statSync(candidate);
    } catch {
      return { status: 'invalid', message: 'That game could not be accessed.' };
    }

    const isMacBundle = process.platform === 'darwin' && candidate.toLowerCase().endsWith('.app');
    if ((!isMacBundle && !stats.isFile()) || (isMacBundle && !stats.isDirectory())) {
      return { status: 'invalid', message: 'Choose a valid installed game application.' };
    }

    const token = randomUUID();
    gameLaunchTokens.set(token, { path: candidate, senderId: event.sender.id });
    while (gameLaunchTokens.size > 64) gameLaunchTokens.delete(gameLaunchTokens.keys().next().value);

    const savedGames = readSavedGameLibrary();
    const normalizedCandidate = process.platform === 'win32' ? candidate.toLowerCase() : candidate;
    let savedGame = savedGames.find((entry) => (
      (process.platform === 'win32' ? entry.path.toLowerCase() : entry.path) === normalizedCandidate
    ));
    if (!savedGame) {
      savedGame = {
        id: randomUUID(),
        path: candidate,
        name: path.basename(candidate, path.extname(candidate)),
        addedAt: Date.now()
      };
      writeSavedGameLibrary([savedGame, ...savedGames].slice(0, 120));
    }

    return {
      status: 'selected',
      token,
      libraryId: savedGame.id,
      name: savedGame.name
    };
  });

  ipcMain.handle('harbor:list-games', () => readSavedGameLibrary().map(gameLibrarySummary));

  ipcMain.handle('harbor:remove-game', (_event, libraryId) => {
    if (typeof libraryId !== 'string') return { status: 'invalid' };
    const savedGames = readSavedGameLibrary();
    const nextGames = savedGames.filter((entry) => entry.id !== libraryId);
    if (nextGames.length === savedGames.length) return { status: 'missing' };
    writeSavedGameLibrary(nextGames);
    return { status: 'removed' };
  });

  ipcMain.handle('harbor:launch-saved-game', async (_event, libraryId) => {
    if (typeof libraryId !== 'string') return { status: 'invalid', message: 'Add the game again before launching it.' };
    const selection = readSavedGameLibrary().find((entry) => entry.id === libraryId);
    if (!selection) return { status: 'missing', message: 'That game is no longer in your Harbor library.' };
    if (!isAllowedGamePath(selection.path) || !fs.existsSync(selection.path)) {
      return { status: 'missing', message: 'The game has moved or is no longer installed.' };
    }
    const error = await shell.openPath(selection.path);
    if (error) return { status: 'error', message: error };
    return { status: 'opened' };
  });

  ipcMain.handle('harbor:launch-game', async (event, token) => {
    if (typeof token !== 'string') return { status: 'invalid', message: 'Add the game again before launching it.' };

    const selection = gameLaunchTokens.get(token);
    if (!selection || selection.senderId !== event.sender.id) {
      return { status: 'invalid', message: 'Add the game again before launching it.' };
    }

    if (!isAllowedGamePath(selection.path) || !fs.existsSync(selection.path)) {
      gameLaunchTokens.delete(token);
      return { status: 'missing', message: 'The game has moved or is no longer installed.' };
    }

    const error = await shell.openPath(selection.path);
    if (error) return { status: 'error', message: error };
    return { status: 'opened' };
  });

  ipcMain.handle('harbor:choose-update', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: 'Choose a Harbor update',
      defaultPath: app.getPath('downloads'),
      properties: ['openFile'],
      filters: releaseFilters[process.platform] || [{ name: 'Harbor release', extensions: ['*'] }]
    });

    if (result.canceled || result.filePaths.length !== 1) return { status: 'cancelled' };

    const candidate = path.resolve(result.filePaths[0]);
    const fileName = path.basename(candidate);
    const pattern = releasePattern[process.platform];

    if (!pattern || !pattern.test(fileName)) {
      return {
        status: 'invalid',
        message: 'Choose an official Harbor release file for this operating system.'
      };
    }

    try {
      if (!await verifyOfficialRelease(candidate)) {
        return { status: 'invalid', message: 'Harbor could not verify this file against the official release checksum.' };
      }
    } catch {
      return { status: 'error', message: 'Harbor could not verify the update. Check your connection and try again.' };
    }

    const error = await shell.openPath(candidate);
    if (error) return { status: 'error', message: error };
    return { status: 'opened' };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
