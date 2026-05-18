const { contextBridge } = require('electron');
const os = require('os');

contextBridge.exposeInMainWorld('electronAPI', {
  getHostName: () => os.hostname()
});