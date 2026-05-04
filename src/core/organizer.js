const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const store = require('../services/store');

const EXTENSIONS = {
  Imagens: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.tiff',
    '.webp',
    '.ico',
    '.svg',
    '.heic',
    '.raw',
    '.cr2',
    '.nef'
  ],
  Vídeos: [
    '.mp4',
    '.avi',
    '.mkv',
    '.mov',
    '.wmv',
    '.flv',
    '.webm',
    '.m4v',
    '.mpg',
    '.mpeg',
    '.3gp',
    '.ogv'
  ],
  Documentos: [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.txt',
    '.rtf',
    '.odt',
    '.ods',
    '.odp',
    '.csv',
    '.md',
    '.epub',
    '.mobi',
    '.azw3'
  ],
  Música: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.alac', '.aiff'],
  Executáveis: [
    '.exe',
    '.msi',
    '.bat',
    '.cmd',
    '.ps1',
    '.sh',
    '.app',
    '.dmg',
    '.pkg',
    '.deb',
    '.rpm'
  ],
  ZIP: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso', '.cab', '.arj']
};

function getCategoryByExtension(ext) {
  ext = ext.toLowerCase();
  for (const [category, extensions] of Object.entries(EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }
  return null;
}

function getIntelligentCategory(filename) {
  const rules = store.get('rules');
  const lowerName = filename.toLowerCase();

  for (const [category, keywords] of Object.entries(rules)) {
    if (keywords.some((keyword) => lowerName.includes(keyword))) {
      return category;
    }
  }
  return null;
}

async function getUniqueFilePath(destPath) {
  if (!fsSync.existsSync(destPath)) return destPath;
  const dir = path.dirname(destPath);
  const ext = path.extname(destPath);
  const name = path.basename(destPath, ext);
  let counter = 1;
  while (true) {
    const newPath = path.join(dir, `${name} (${counter})${ext}`);
    if (!fsSync.existsSync(newPath)) return newPath;
    counter++;
  }
}

async function organizeFolder(folderPath, updateCallback = null) {
  try {
    const files = await fs.readdir(folderPath, { withFileTypes: true });
    let movedFiles = [];

    // Ensure all target folders exist based on active files to organize
    for (const file of files) {
      if (!file.isFile()) continue;
      // Skip system files and app files
      if (
        file.name.startsWith('.') ||
        file.name.includes('organizador') ||
        file.name === 'main.js' ||
        file.name.endsWith('.asar')
      )
        continue;

      const ext = path.extname(file.name);

      // 1. Check intelligent patterns
      let category = getIntelligentCategory(file.name);

      // 2. Fallback to extensions
      if (!category) {
        category = getCategoryByExtension(ext);
      }

      if (category) {
        const catPath = path.join(folderPath, category);
        if (!fsSync.existsSync(catPath)) {
          await fs.mkdir(catPath, { recursive: true });
        }

        const sourcePath = path.join(folderPath, file.name);
        const destPath = path.join(catPath, file.name);
        const finalDestPath = await getUniqueFilePath(destPath);

        await fs.rename(sourcePath, finalDestPath);

        movedFiles.push({
          originalPath: sourcePath,
          newPath: finalDestPath,
          filename: file.name,
          category
        });

        if (updateCallback) updateCallback(movedFiles.length);
      }
    }

    if (movedFiles.length > 0) {
      const historyRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        folder: folderPath,
        count: movedFiles.length,
        files: movedFiles
      };
      const history = store.get('history');
      history.unshift(historyRecord);
      // keep only last 50 items
      store.set('history', history.slice(0, 50));
    }

    return { success: true, count: movedFiles.length };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

async function undoLastAction() {
  try {
    const history = store.get('history');
    if (history.length === 0) return { success: false, error: 'Nenhum histórico para desfazer.' };

    const lastAction = history[0];
    let undoneCount = 0;

    for (const file of lastAction.files) {
      if (fsSync.existsSync(file.newPath)) {
        // We attempt to move it back
        const finalSourcePath = await getUniqueFilePath(file.originalPath);
        await fs.rename(file.newPath, finalSourcePath);
        undoneCount++;
      }
    }

    // Remove from history
    history.shift();
    store.set('history', history);

    return { success: true, count: undoneCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  organizeFolder,
  undoLastAction,
  getIntelligentCategory
};
