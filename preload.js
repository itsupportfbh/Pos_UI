const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

contextBridge.exposeInMainWorld('electronAPI', {
  getHostName: () => os.hostname(),
  executeQuery: (sql, params = []) =>
    ipcRenderer.invoke('sqlite-query', sql, Array.isArray(params) ? params : [params])
});