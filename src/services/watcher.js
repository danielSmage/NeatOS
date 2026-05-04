const chokidar = require('chokidar');
const { organizeFolder } = require('../core/organizer');
const store = require('./store');

let watchers = {};

function startWatching(folderPath, window = null) {
  if (watchers[folderPath]) return;

  const watcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\..|organizador|main\.js/, // ignore dotfiles and app files
    persistent: true,
    depth: 0, // only watch the direct folder, not subfolders
    ignoreInitial: true, // ignore existing files
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  watcher.on('add', async (filePath) => {
    // A new file was added. Wait a bit then organize the folder.
    // We organize the whole folder to catch any other files, but could just organize the single file.
    // For simplicity, calling organizeFolder on the specific folder path.
    console.log(`[Watcher] Novo arquivo detectado: ${filePath}`);
    try {
      const result = await organizeFolder(folderPath);
      if (result.success && result.count > 0 && window) {
        window.webContents.send('watcher:organized', { folder: folderPath, count: result.count });
      }
    } catch (e) {
      console.error(e);
    }
  });

  watchers[folderPath] = watcher;

  const watchedList = store.get('watchFolders') || [];
  if (!watchedList.includes(folderPath)) {
    watchedList.push(folderPath);
    store.set('watchFolders', watchedList);
  }
}

function stopWatching(folderPath) {
  if (watchers[folderPath]) {
    watchers[folderPath].close();
    delete watchers[folderPath];

    let watchedList = store.get('watchFolders') || [];
    watchedList = watchedList.filter((f) => f !== folderPath);
    store.set('watchFolders', watchedList);
  }
}

function initializeWatchers(window) {
  const watchedList = store.get('watchFolders') || [];
  watchedList.forEach((folder) => {
    startWatching(folder, window);
  });
}

function isWatching(folderPath) {
  return !!watchers[folderPath];
}

module.exports = {
  startWatching,
  stopWatching,
  initializeWatchers,
  isWatching
};
