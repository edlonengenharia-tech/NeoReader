// NekoReader - Main process
// NO native canvas dependency! PDF rendering happens in the renderer process.
const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const tar = require('tar');
const { createExtractorFromData } = require('node-unrar-js');

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

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

// ---- Archive reading ----
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

function guessMime(name) {
  const ext = path.extname(name).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.bmp': 'image/bmp',
  };
  return map[ext] || 'image/jpeg';
}

function isImageFile(name) {
  const lower = name.toLowerCase();
  return IMAGE_EXTS.some(ext => lower.endsWith(ext));
}

// Detecta o formato real do arquivo pelos bytes iniciais
function detectFileFormat(filePath) {
  try {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    // PDF: %PDF
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'pdf';
    }
    
    // ZIP/CBZ: PK (0x50 0x4B)
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
      return 'zip';
    }
    
    // RAR: Rar! (0x52 0x61 0x72 0x21)
    if (buffer[0] === 0x52 && buffer[1] === 0x61 && buffer[2] === 0x72 && buffer[3] === 0x21) {
      return 'rar';
    }
    
    // 7Z: 7z (0x37 0x7A 0xBC 0xAF)
    if (buffer[0] === 0x37 && buffer[1] === 0x7A && buffer[2] === 0xBC && buffer[3] === 0xAF) {
      return '7z';
    }
    
    return 'unknown';
  } catch (error) {
    console.error('[detectFileFormat] Erro:', error);
    return 'unknown';
  }
}

// CBZ/ZIP
function readCBZ(filePath) {
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries()
    .filter(e => !e.isDirectory && isImageFile(e.entryName))
    .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));

  return entries.map(entry => ({
    name: entry.entryName,
    data: entry.getData().toString('base64'),
    mime: guessMime(entry.entryName),
  }));
}

// CBR/RAR (pure JS via node-unrar-js - NO native deps!)
async function readCBR(filePath) {
  try {
    // Read file as ArrayBuffer
    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    // Create extractor from data (in-memory extraction)
    const extractor = await createExtractorFromData({ data: arrayBuffer });
    
    // Get file list
    const list = extractor.getFileList();
    const fileHeaders = Array.from(list.fileHeaders);
    
    // Filter and sort image files
    const imageFiles = fileHeaders
      .filter(h => !h.flags.directory && isImageFile(h.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    
    if (imageFiles.length === 0) {
      throw new Error('Nenhuma imagem encontrada no arquivo RAR.');
    }
    
    // Extract all images
    const extracted = extractor.extract({ files: imageFiles.map(h => h.name) });
    const files = Array.from(extracted.files);
    
    return files.map(file => ({
      name: file.fileHeader.name,
      data: Buffer.from(file.extraction).toString('base64'),
      mime: guessMime(file.fileHeader.name),
    }));
  } catch (error) {
    console.error('CBR read error:', error);
    throw new Error(`Erro ao ler CBR: ${error.message}. O arquivo pode estar corrompido ou usar RAR5 (converta para CBZ com 7-Zip).`);
  }
}

// CBT/TAR
async function readCBT(filePath) {
  throw new Error('Formato CBT/TAR ainda não suportado. Converta para CBZ.');
}

// PDF: send raw data, renderer will use pdf.js
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
  const realFormat = detectFileFormat(filePath);
  
  console.log('[book:open] Tentando abrir:', filePath);
  console.log('[book:open] Extensão:', ext, '| Formato real:', realFormat);

  try {
    // Usa o formato real se detectado, senão usa a extensão
    const format = realFormat !== 'unknown' ? realFormat : 
                   (ext === '.pdf' ? 'pdf' : 
                    ext === '.cbz' || ext === '.zip' ? 'zip' :
                    ext === '.cbr' || ext === '.rar' ? 'rar' : 'unknown');

    if (format === 'pdf') {
      console.log('[book:open] Usando readPDF');
      const data = readPDF(filePath);
      return { type: 'pdf', data: data, path: filePath };
    }

    if (format === 'zip') {
      console.log('[book:open] Usando readCBZ');
      const pages = readCBZ(filePath);
      return { type: 'cbz', pages: pages, path: filePath };
    }

    if (format === 'rar') {
      console.log('[book:open] Usando readCBR');
      const pages = await readCBR(filePath);
      return { type: 'cbr', pages: pages, path: filePath };
    }

    if (ext === '.cbt' || ext === '.tar') {
      console.log('[book:open] Usando readCBT');
      const pages = await readCBT(filePath);
      return { type: 'cbt', pages: pages, path: filePath };
    }

    throw new Error(`Formato não suportado: ${ext} (detectado: ${realFormat}). Use .cbz, .cbr, .zip ou .pdf`);
  } catch (error) {
    console.error('[book:open] Erro ao abrir arquivo:', error);
    throw error;
  }
});

ipcMain.handle('dialog:openFiles', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Livros', extensions: ['cbz', 'cbr', 'zip', 'rar', 'pdf', 'cbt', 'tar'] },
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

// Keep awake
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

// AI integration
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
      model: model,
      messages: messages,
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
      settings: settings,
    });
    return result;
  } catch (e) {
    throw e;
  }
});
