const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { createExtractorFromData } = require('node-unrar-js');

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
    },
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

ipcMain.handle('neko:extract-rar', async (_event, payload) => {
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

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
