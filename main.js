const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'build/icons/cspl-logo.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });


 
  win.loadURL(`file://${path.join(__dirname, 'dist/unity-work-pos/browser/index.html')}`);
}

app.whenReady().then(createWindow);