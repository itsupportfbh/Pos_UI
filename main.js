const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./electron/database/db');

// The SQLite schema is managed in the existing database file.
// Do not recreate tables or seed demo data here on startup.

ipcMain.handle('sqlite-query', async (_, sql, params = []) => {
  try {
    const safeParams = Array.isArray(params) ? params : [params];
    const stmt = db.prepare(sql);

    return {
      values: stmt.all(...safeParams),
      error: null
    };
  } catch (error) {
    console.error('sqlite-query failed:', error);

    return {
      values: [],
      error: error instanceof Error ? error.message : 'Unknown SQLite error'
    };
  }
});

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

  win.webContents.openDevTools();

  win.loadURL(
    `file://${path.join(
      __dirname,
      'dist/unity-work-pos/browser/index.html'
    )}`
  );
}

app.whenReady().then(createWindow);