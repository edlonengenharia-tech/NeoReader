const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nekoDesktop', {
  extractRar: (bytes) => ipcRenderer.invoke('neko:extract-rar', bytes),
});
