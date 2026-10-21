// Preload do NekkoReader — API mínima e validada exposta ao renderer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nekkoDesktop', {
  extractRar: (bytes) => {
    if (!(bytes instanceof Uint8Array)) return Promise.reject(new Error('Payload inválido'));
    return ipcRenderer.invoke('nekko:extract-rar', bytes);
  },
});

contextBridge.exposeInMainWorld('nekkoStore', {
  readJson: (name) => {
    if (typeof name !== 'string' || !/^[\w-]{1,40}$/.test(name)) {
      return Promise.reject(new Error('Nome de chave inválido'));
    }
    return ipcRenderer.invoke('nekko:store-read', name);
  },
  writeJson: (name, data) => {
    if (typeof name !== 'string' || !/^[\w-]{1,40}$/.test(name)) {
      return Promise.reject(new Error('Nome de chave inválido'));
    }
    try {
      JSON.stringify(data); // garante serializável antes de enviar
    } catch {
      return Promise.reject(new Error('Dados não serializáveis'));
    }
    return ipcRenderer.invoke('nekko:store-write', { name, data });
  },
});
