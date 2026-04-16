const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.PGURL || process.env.URL;
let pool = null;
let sqliteDb = null;

if (connectionString) {
  // Postgres ulanishi
  pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  console.log('📡 [DB] PostgreSQL bazasiga ulanish sozlandi.');
} else {
  // Agar Postgres yo'q bo'lsa - SQLite ishlatamiz
  const dbPath = path.resolve(__dirname, '../../../taxta_crm.sqlite');
  sqliteDb = new sqlite3.Database(dbPath);
  console.log('📦 [DB] SQLite (Local File) ishlatilmoqda. (DATABASE_URL topilmadi)');
}

// Universal query funksiyasi
const query = (text, params) => {
  if (pool) {
    // Postgres uchun
    return pool.query(text, params);
  } else {
    // SQLite uchun (Postgres syntaxini SQLite-ga moslashtiramiz)
    const sql = text.replace(/\$(\d+)/g, '?');
    return new Promise((resolve, reject) => {
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      } else {
        sqliteDb.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ rows: [{ id: this.lastID }], rowCount: this.changes });
        });
      }
    });
  }
};

module.exports = { query };
