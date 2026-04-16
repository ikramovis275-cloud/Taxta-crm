const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.PGURL || process.env.URL;
let pool = null;
let sqliteDb = null;

// In-Memory Database (Agar hamma narsa ishlamay qolsa foydalanish uchun)
const memory_storage = {
  users: [],
  products: [],
  sales: [],
  sale_items: [],
  settings: [{ key: 'usd_rate', value: '12800' }]
};

if (connectionString) {
  pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });
} else {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, '../../../taxta_crm.sqlite');
    sqliteDb = new sqlite3.Database(dbPath);
  } catch (e) {
    console.warn('⚠️ [DB] In-Memory rejimiga o\'tildi.');
  }
}

const query = async (text, params) => {
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

  // --- FAILSAYE: IN-MEMORY LOGIC ---
  const cmd = text.trim().toUpperCase();
  if (cmd.startsWith('SELECT * FROM PRODUCTS')) {
    return { rows: memory_storage.products };
  }
  if (cmd.startsWith('INSERT INTO PRODUCTS')) {
    const newProd = { id: Date.now(), code: params[0], name: params[1], dimensions: params[2], piece_volume: params[3], volume: params[4], quantity: params[5], unit: params[6], cost_price_dollar: params[7], sale_price_dollar: params[8] };
    memory_storage.products.push(newProd);
    return { rows: [newProd] };
  }
  if (cmd.startsWith('SELECT VALUE FROM SETTINGS')) {
    return { rows: [{ value: '12800' }] };
  }
  if (cmd.startsWith('SELECT COUNT(*)')) {
    return { rows: [{ count: memory_storage.products.length }] };
  }
  if (cmd.startsWith('SELECT * FROM USERS')) {
    return { rows: memory_storage.users };
  }

  return { rows: [], rowCount: 0 };
};

module.exports = { query };
