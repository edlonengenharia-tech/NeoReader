// NekoReader - Main process
// NO native canvas dependency! PDF rendering happens in the renderer process.
const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const tar = require('tar');

// ---- State persistence ----
const STATE_DIR = path.join(app.getPath('userData'));
const STATE_FILE = path.join(STATE_DIR, 'state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (e) { console.error('State load error:', e); }
  return {
    settings: {
      theme: 'dark',
      mangaByDefault: false,
      doublePageByDefault: false,
      fit: 'width',
      flipAnimation: true,
      prefetch: 3,
      clickZones: true,
      showLibraryOnStart: true,
      sidebarWidth: 300,
      keepAwake: true,
      aiProvider: 'qwen',
      aiKey: '',
      aiBaseUrl: '',
      aiModel: '',
    },
    positions: {},
    libraryFolders: [],
    excluded: [],
  };
}

function saveState(state) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) { console.error('State save error:', e); }
}

let appState = loadState();

// ---- Window ----
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#14161b',
    title: 'NekoReader',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for preload to use require
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ---- Single instance ----
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      // Open file from CLI
      const fileArg = argv.find(a => /\.(cbz|cbr|cbt|cb7|zip|rar|7z|tar|pdf)$/i.test(a));
      if (fileArg && mainWindow) {
        mainWindow.webContents.once('did-finish-load', () => {
          mainWindow.webContents.send('open-path', fileArg);
        });
      }
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  // Open file from CLI on first launch
  const fileArg = process.argv.find(a => /\.(cbz|cbr|cbt|cb7|zip|rar|7z|tar|pdf)$/i.test(a));
  if (fileArg && mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('open-path', fileArg);
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---- Archive reading (CBZ/ZIP) ----
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

function readCBZ(filePath) {
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries()
    .filter(e => !e.isDirectory && IMAGE_EXTS.some(ext => e.entryName.toLowerCase().endsWith(ext)))
    .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));

  return entries.map(entry => ({
    name: entry.entryName,
    data: entry.getData().toString('base64'),
    mime: guessMime(entry.entryName),
  }));
}

function guessMime(name) {
  const ext = path.extname(name).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.bmp': 'image/bmp',
  };
  return map[ext] || 'image/jpeg';
}

// ---- PDF: just send raw data, renderer will use pdf.js ----
function readPDF(filePath) {
  const buf = fs.readFileSync(filePath);
  return buf.toString('base64');
}

// ---- IPC handlers ----

ipcMain.handle('state:get', () => appState);

ipcMain.handle('state:set', (_e, partial) => {
  appState = { ...appState, ...partial };
  saveState(appState);
  return appState;
});

ipcMain.handle('book:open', async (_e, filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const data = readPDF(filePath);
    return { type: 'pdf', data, path: filePath };
  }

  if (['.cbz', '.zip'].includes(ext)) {
    const pages = readCBZ(filePath);
    return { type: 'cbz', pages, path: filePath };
  }

  if (['.cbt', '.tar', '.tgz'].includes(ext) || ext.endsWith('.tar.gz')) {
    // TAR support - list files, extract images
    // For simplicity, return an error for now
    throw new Error('Formato TAR/CBT ainda não suportado nesta versão. Converta para CBZ.');
  }

  throw new Error(`Formato não suportado: ${ext}. Use .cbz, .zip ou .pdf`);
});

ipcMain.handle('dialog:openFiles', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Livros', extensions: ['cbz', 'zip', 'pdf', 'cbr', 'cbt', 'cb7'] },
      { name: 'Todos', extensions: ['*'] },
    ],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// Window controls
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('win:close', () => mainWindow?.close());

ipcMain.handle('win:setFullScreen', (_e, flag) => {
  mainWindow?.setFullScreen(flag);
  return true;
});

ipcMain.handle('shell:openExternal', (_e, url) => {
  shell.openExternal(url);
  return true;
});

// Keep awake (power save blocker)
let powerSaveBlockerId = null;
const { powerSaveBlocker } = require('electron');

ipcMain.handle('power:keepAwake', (_e, on) => {
  if (on && powerSaveBlockerId === null) {
    powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  } else if (!on && powerSaveBlockerId !== null) {
    powerSaveBlocker.stop(powerSaveBlockerId);
    powerSaveBlockerId = null;
  }
  return powerSaveBlockerId !== null;
});

// AI integration (runs in main process to bypass CORS)
ipcMain.handle('ai:ask', async (_e, { messages, settings }) => {
  const baseUrl = settings.aiBaseUrl ||
    (settings.aiProvider === 'qwen'
      ? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions'
      : 'http://localhost:11434/v1/chat/completions');

  const model = settings.aiModel || (settings.aiProvider === 'qwen' ? 'qwen-plus' : 'qwen2.5:7b');

  const resp = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.aiKey ? { 'Authorization': `Bearer ${settings.aiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI error ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'Sem resposta.';
});

ipcMain.handle('ai:test', async (_e, settings) => {
  try {
    const result = await ipcMain.emit('ai:ask', null, {
      messages: [{ role: 'user', content: 'Diga olá em uma frase curta.' }],
      settings,
    });
    return result;
  } catch (e) {
    throw e;
  }
});
