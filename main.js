const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

 
  win.loadURL(`file://${path.join(__dirname, 'dist/unity-work-pos/browser/index.html')}`);
}

app.whenReady().then(createWindow);