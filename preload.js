const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  stopServer: () => ipcRenderer.send('stop-server')
});
