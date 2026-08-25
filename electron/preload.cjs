const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harbor', {
  getVersion: () => ipcRenderer.invoke('harbor:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('harbor:check-for-updates'),
  getUpdateState: () => ipcRenderer.invoke('harbor:get-update-state'),
  downloadUpdate: () => ipcRenderer.invoke('harbor:download-update'),
  installUpdate: () => ipcRenderer.invoke('harbor:install-update'),
  onUpdateState: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('harbor:update-state', listener);
    return () => ipcRenderer.removeListener('harbor:update-state', listener);
  },
  getDiagnostics: () => ipcRenderer.invoke('harbor:get-diagnostics'),
  copyDiagnostics: () => ipcRenderer.invoke('harbor:copy-diagnostics'),
  openTrustedPage: (page) => ipcRenderer.invoke('harbor:open-trusted-page', page),
  chooseGame: () => ipcRenderer.invoke('harbor:choose-game'),
  launchGame: (token) => ipcRenderer.invoke('harbor:launch-game', token),
  listGames: () => ipcRenderer.invoke('harbor:list-games'),
  launchSavedGame: (libraryId) => ipcRenderer.invoke('harbor:launch-saved-game', libraryId),
  removeGame: (libraryId) => ipcRenderer.invoke('harbor:remove-game', libraryId),
  getDirectoryLinks: () => ipcRenderer.invoke('harbor:get-directory-links'),
  openDirectoryLink: (url) => ipcRenderer.invoke('harbor:open-directory-link', url),
  exportUserData: (state) => ipcRenderer.invoke('harbor:export-user-data', state),
  importUserData: () => ipcRenderer.invoke('harbor:import-user-data'),
  chooseUpdate: () => ipcRenderer.invoke('harbor:choose-update'),
  openReleasePage: () => ipcRenderer.invoke('harbor:open-release-page')
});
