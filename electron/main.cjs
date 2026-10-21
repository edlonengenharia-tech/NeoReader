// Main process do NekkoReader — hardening no estilo ACBR (safe environment):
// - instância única
// - sandbox + permissões negadas
// - bloqueio de navegação externa e novas janelas
// - persistência JSON em userData (settings/positions/library)
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createExtractorFromData } = require('node-unrar-js');

const ALLOWED_STORE_KEYS = new Set(['settings', 'positions', 'library']);

// ---------- instância única ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// ---------- persistência em arquivo (padrão ACBR favorites/history/settings) ----------
function storePath(name) {
  if (!ALLOWED_STORE_KEYS.has(name)) throw new Error('Chave não permitida');
  return path.join(app.getPath('userData'), `${name}.json`);
}

ipcMain.handle('nekko:store-read', async (_e, name) => {
  try {
    const raw = await fs.readFile(storePath(name), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

ipcMain.handle('nekko:store-write', async (_e, { name, data }) => {
  const p = storePath(name);
  const tmp = p + '.tmp';
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(data), 'utf8');
  await fs.rename(tmp, p); // escrita atômica
});

// ---------- extração RAR sob demanda (CBR) ----------
ipcMain.handle('nekko:extract-rar', async (_event, payload) => {
  try {
    const data = Uint8Array.from(payload);
    const extractor = await createExtractorFromData({ data });
    const list = extractor.getFileList();
    const names = [...list.fileHeaders].map((h) => h.name).filter((n) => !n.endsWith('/'));
    const extracted = extractor.extract({ files: names });
    return [...extracted.files]
      .filter((f) => f.extraction && f.extraction.length > 0)
      .map((f) => ({ name: f.fileHeader.name, bytes: f.extraction }));
  } catch (e) {
    throw new Error('Nao foi possivel ler este .cbr. Se tiver senha ou estiver corrompido, converta para .cbz. Detalhe: ' + (e && e.message ? e.message : String(e)));
  }
});

// ---------- janela ----------
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#14161b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  // Hardening: nada de navegação para fora do app nem novas janelas
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) e.preventDefault();
  });

  // Nega permissões não usadas (câmera, mic, geoloc etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
