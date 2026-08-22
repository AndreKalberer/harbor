const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harbor', {
  getVersion: () => ipcRenderer.invoke('harbor:get-version'),
  chooseGame: () => ipcRenderer.invoke('harbor:choose-game'),
  launchGame: (token) => ipcRenderer.invoke('harbor:launch-game', token),
  listGames: () => ipcRenderer.invoke('harbor:list-games'),
  launchSavedGame: (libraryId) => ipcRenderer.invoke('harbor:launch-saved-game', libraryId),
  removeGame: (libraryId) => ipcRenderer.invoke('harbor:remove-game', libraryId),
  chooseUpdate: () => ipcRenderer.invoke('harbor:choose-update'),
  openReleasePage: () => ipcRenderer.invoke('harbor:open-release-page')
});
