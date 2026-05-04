const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const store = require('./src/services/store');
const { organizeFolder, undoLastAction } = require('./src/core/organizer');
const {
  startWatching,
  stopWatching,
  initializeWatchers,
  isWatching
} = require('./src/services/watcher');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: store.get('theme') === 'dark' ? '#050505' : '#ffffff',
      symbolColor: store.get('theme') === 'dark' ? '#ffffff' : '#000000',
      height: 32
    },
    backgroundColor: store.get('theme') === 'dark' ? '#050505' : '#ffffff',
    show: false
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.loadFile('index.html');

  // Initialize watchers that were active previously
  initializeWatchers(win);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('dialog:selectFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('organize:files', async (event, folderPath) => {
  // Pass a callback to send progress to UI if we want to simulate or show real progress
  return await organizeFolder(folderPath, (count) => {
    win.webContents.send('organize:progress', count);
  });
});

ipcMain.handle('history:undo', async () => {
  return await undoLastAction();
});

ipcMain.handle('history:get', () => {
  return store.get('history');
});

ipcMain.handle('store:get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store:set', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('watcher:toggle', (event, folderPath, state) => {
  if (state) {
    startWatching(folderPath, win);
  } else {
    stopWatching(folderPath);
  }
  return true;
});

ipcMain.handle('watcher:status', (event, folderPath) => {
  return isWatching(folderPath);
});
