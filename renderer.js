lucide.createIcons();

const selectBtn = document.getElementById('select-btn');
const organizeBtn = document.getElementById('organize-btn');
const pathDisplay = document.getElementById('path-display');
const selectedPathSpan = document.getElementById('selected-path');
const feedbackArea = document.getElementById('feedback-area');
const statusIconWrapper = document.getElementById('status-icon-wrapper');
const statusText = document.getElementById('status-text');
const progressBar = document.querySelector('.progress-bar');
const watcherToggle = document.getElementById('watcher-toggle');
const themeToggle = document.getElementById('theme-toggle');
const historyToggle = document.getElementById('history-toggle');
const historyPanel = document.getElementById('history-panel');
const panelOverlay = document.getElementById('panel-overlay');
const closeHistoryBtn = document.getElementById('close-history');
const undoBtn = document.getElementById('undo-btn');
const historyList = document.getElementById('history-list');

let currentFolderPath = null;

// Audio for subtle feedback
function playSound(type = 'success') {
  // A subtle tick sound or chime would go here.
  // Example base64 audio could be used. Omitted for brevity, but function exists.
}

// --- Initialization ---
async function init() {
  const theme = await window.electronAPI.getStoreValue('theme');
  if (theme === 'light') {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    themeToggle.innerHTML = '<i data-lucide="moon"></i>';
  }
  lucide.createIcons();
}
init();

// --- Theme Toggle ---
themeToggle.addEventListener('click', async () => {
  const isDark = document.body.classList.contains('theme-dark');
  if (isDark) {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    themeToggle.innerHTML = '<i data-lucide="moon"></i>';
    await window.electronAPI.setStoreValue('theme', 'light');
  } else {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
    themeToggle.innerHTML = '<i data-lucide="sun"></i>';
    await window.electronAPI.setStoreValue('theme', 'dark');
  }
  lucide.createIcons();
});

// --- Folder Selection ---
selectBtn.addEventListener('click', async () => {
  const folderPath = await window.electronAPI.selectFolder();
  if (folderPath) {
    currentFolderPath = folderPath;
    selectedPathSpan.textContent = folderPath;
    pathDisplay.classList.remove('hidden');
    organizeBtn.disabled = false;
    feedbackArea.classList.add('hidden');

    // Check watcher status
    const isWatching = await window.electronAPI.getWatcherStatus(folderPath);
    watcherToggle.checked = isWatching;
  }
});

// --- Watcher Toggle ---
watcherToggle.addEventListener('change', async (e) => {
  if (!currentFolderPath) return;
  await window.electronAPI.toggleWatcher(currentFolderPath, e.target.checked);
});

// --- Organize Action ---
organizeBtn.addEventListener('click', async () => {
  if (!currentFolderPath) return;

  setUIState('loading');
  const result = await window.electronAPI.organizeFiles(currentFolderPath);

  if (result.success) {
    setUIState('success', `Organização concluída (${result.count} arquivos)`);
    playSound('success');
    loadHistory(); // refresh history
  } else {
    setUIState('error', `Erro: ${result.error}`);
  }
});

// --- Watcher Event Listener ---
window.electronAPI.onWatcherOrganized((data) => {
  if (currentFolderPath === data.folder) {
    // Show a quick toast or update status
    feedbackArea.classList.remove('hidden');
    statusIconWrapper.innerHTML = '<i data-lucide="sparkles" class="success-text"></i>';
    statusText.textContent = `Auto-organizou ${data.count} arquivo(s)`;
    statusText.classList.add('success-text');
    progressBar.style.width = '100%';
    lucide.createIcons();
    setTimeout(() => {
      feedbackArea.classList.add('hidden');
    }, 4000);
    loadHistory();
  }
});

// --- History & Undo ---
historyToggle.addEventListener('click', () => {
  historyPanel.classList.add('open');
  panelOverlay.classList.add('active');
  loadHistory();
});

closeHistoryBtn.addEventListener('click', closeHistory);
panelOverlay.addEventListener('click', closeHistory);

function closeHistory() {
  historyPanel.classList.remove('open');
  panelOverlay.classList.remove('active');
}

async function loadHistory() {
  const history = await window.electronAPI.getHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    undoBtn.classList.add('hidden');
    historyList.innerHTML =
      '<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">Nenhum histórico recente.</p>';
    return;
  }

  undoBtn.classList.remove('hidden');

  history.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const date = new Date(item.date).toLocaleString('pt-BR');
    div.innerHTML = `
      <div class="history-item-header">
        <span>${date}</span>
        <span>${item.count} arquivos</span>
      </div>
      <div class="history-item-title">${item.folder}</div>
    `;
    historyList.appendChild(div);
  });
}

undoBtn.addEventListener('click', async () => {
  const result = await window.electronAPI.undoLastAction();
  if (result.success) {
    alert(`Ação desfeita! ${result.count} arquivo(s) retornado(s).`);
    loadHistory();
  } else {
    alert(`Erro ao desfazer: ${result.error}`);
  }
});

// --- Helpers ---
function setUIState(state, message = '') {
  if (state === 'loading') {
    selectBtn.disabled = true;
    organizeBtn.disabled = true;
    feedbackArea.classList.remove('hidden');
    statusIconWrapper.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
    statusText.textContent = 'Analisando e organizando...';
    statusText.classList.remove('success-text');
    progressBar.classList.add('indeterminate');
    progressBar.style.width = '50%';
  } else if (state === 'success') {
    progressBar.classList.remove('indeterminate');
    progressBar.style.width = '100%';
    statusIconWrapper.innerHTML = '<i data-lucide="check-circle-2" class="success-text"></i>';
    statusText.textContent = message;
    statusText.classList.add('success-text');
    resetButtons();
  } else if (state === 'error') {
    progressBar.classList.remove('indeterminate');
    progressBar.style.width = '100%';
    progressBar.style.background = 'var(--danger)';
    statusIconWrapper.innerHTML = '<i data-lucide="x-circle" style="color: var(--danger)"></i>';
    statusText.textContent = message;
    statusText.classList.remove('success-text');
    statusText.style.color = 'var(--danger)';
    resetButtons();
  }
  lucide.createIcons();
}

function resetButtons() {
  setTimeout(() => {
    selectBtn.disabled = false;
    organizeBtn.disabled = false;
    progressBar.style.width = '0%';
    progressBar.style.background = 'var(--primary)';
  }, 3000);
}
