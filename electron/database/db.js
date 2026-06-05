// const path = require('path');
// const Database = require('better-sqlite3');

// const dbPath = path.join(__dirname, '..', '..', 'database', 'Unitypos.db');
// const db = new Database(dbPath);

// module.exports = db;
const { app } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

const isPackaged = app.isPackaged;

const dbPath = isPackaged
  ? path.join(process.resourcesPath, 'database', 'Unitypos.db')
  : path.join(__dirname, '..', '..', 'database', 'Unitypos.db');

console.log('DB Path:', dbPath);

const db = new Database(dbPath);

module.exports = db;