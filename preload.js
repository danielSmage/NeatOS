const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  organizeFiles: (folderPath) => ipcRenderer.invoke('organize:files', folderPath),

  // History & Store
  getHistory: () => ipcRenderer.invoke('history:get'),
  undoLastAction: () => ipcRenderer.invoke('history:undo'),
  getStoreValue: (key) => ipcRenderer.invoke('store:get', key),
  setStoreValue: (key, value) => ipcRenderer.invoke('store:set', key, value),

  // Watcher
  toggleWatcher: (folderPath, state) => ipcRenderer.invoke('watcher:toggle', folderPath, state),
  getWatcherStatus: (folderPath) => ipcRenderer.invoke('watcher:status', folderPath),

  // Listeners
  onWatcherOrganized: (callback) =>
    ipcRenderer.on('watcher:organized', (event, data) => callback(data)),
  onProgress: (callback) => ipcRenderer.on('organize:progress', (event, count) => callback(count))
});
