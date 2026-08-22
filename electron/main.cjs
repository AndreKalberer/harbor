const { app, BrowserWindow, dialog, ipcMain, shell, session } = require('electron');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const gameLaunchTokens = new Map();
const publicReleaseUrl = 'https://github.com/AndreKalberer/harbor/releases/latest';

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
  });

  window.once('ready-to-show', () => window.show());
  void window.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
};

app.setAboutPanelOptions({
  applicationName: 'Harbor',
  applicationVersion: app.getVersion(),
  copyright: 'Your entertainment, in one place.'
});

app.whenReady().then(() => {
  app.setAppUserModelId('com.harbor.desktop');
  ensureWindowsShortcuts();

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return ['media', 'fullscreen', 'autoplay'].includes(permission);
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(['media', 'fullscreen', 'autoplay'].includes(permission));
  });

  const streamingSession = session.fromPartition('persist:harbor');
  streamingSession.setPermissionCheckHandler((_webContents, permission) => (
    ['media', 'fullscreen', 'autoplay'].includes(permission)
  ));
  streamingSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(['media', 'fullscreen', 'autoplay'].includes(permission));
  });
  streamingSession.on('will-download', (event) => event.preventDefault());

  ipcMain.handle('harbor:get-version', () => app.getVersion());
  ipcMain.handle('harbor:open-release-page', async () => {
    await shell.openExternal(publicReleaseUrl);
    return { status: 'opened' };
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

    const error = await shell.openPath(candidate);
    if (error) return { status: 'error', message: error };
    return { status: 'opened' };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
