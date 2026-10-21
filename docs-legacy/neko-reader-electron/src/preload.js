// NekoReader - Preload script (context bridge)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('neko', {
  // State
  getState: () => ipcRenderer.invoke('state:get'),
  setState: (partial) => ipcRenderer.invoke('state:set', partial),

  // Book
  openBook: (filePath) => ipcRenderer.invoke('book:open', filePath),

  // Dialogs
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  // Window controls
  winMinimize: () => ipcRenderer.send('win:minimize'),
  winMaximize: () => ipcRenderer.send('win:maximize'),
  winClose: () => ipcRenderer.send('win:close'),
  setFullScreen: (flag) => ipcRenderer.invoke('win:setFullScreen', flag),

  // External
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Power
  setKeepAwake: (on) => ipcRenderer.invoke('power:keepAwake', on),

  // AI
  aiAsk: (payload) => ipcRenderer.invoke('ai:ask', payload),
  aiTest: (settings) => ipcRenderer.invoke('ai:test', settings),

  // Events from main
  onOpenPath: (callback) => {
    ipcRenderer.on('open-path', (_e, path) => callback(path));
  },
});
