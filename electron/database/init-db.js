const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', '..', 'database', 'Unitypos.db');
const db = new Database(dbPath);

try {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all();

  console.log('Using existing SQLite database at', dbPath);
  console.log('Available tables:', tables.map((table) => table.name).join(', ') || 'none');
} catch (error) {
  console.error('Unable to read existing SQLite database:', error);
  process.exitCode = 1;
} finally {
  db.close();
}
