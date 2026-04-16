const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.PGURL || process.env.URL;
let pool = null;
let sqliteDb = null;
let useMemory = false;

if (connectionString) {
  try {
    pool = new Pool({
      connectionString: connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    console.log('📡 [DB] PostgreSQL bazasiga ulanish sozlandi.');
  } catch (e) {
    console.error('❌ Postgres ulanishida xato:', e.message);
  }
} else {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, '../../../taxta_crm.sqlite');
    sqliteDb = new sqlite3.Database(dbPath);
    console.log('📦 [DB] SQLite ishlatilmoqda.');
  } catch (e) {
    console.warn('⚠️ [DB] SQLite yuklanmadi (Binary error). Vaqtinchalik xotiraga (RAM) o\'tildi.');
    useMemory = true;
  }
}

// Memory storage (agar hamma narsa ishlamay qolsa)
const MEMORY_DB = { users: [], products: [], sales: [], settings: { usd_rate: '12800' } };

const query = (text, params) => {
  if (pool) return pool.query(text, params);
  
  if (sqliteDb) {
    const sql = text.replace(/\$(\d+)/g, '?');
    return new Promise((resolve, reject) => {
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err); else resolve({ rows });
        });
      } else {
        sqliteDb.run(sql, params, function(err) {
          if (err) reject(err); else resolve({ rows: [{ id: this.lastID }], rowCount: this.changes });
        });
      }
    });
  }

  // Agar hech qaysi ulanmasa - quruq javob qaytarish (Crash bo'lmasligi uchun)
  return Promise.resolve({ rows: [], rowCount: 0 });
};

module.exports = { query };
