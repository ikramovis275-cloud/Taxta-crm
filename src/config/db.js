const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.PGURL || process.env.URL;
let pool = null;
let sqliteDb = null;

// To'liq vaqtinchalik xotira tizimi
const memory_storage = {
  users: [],
  products: [],
  sales: [],
  sale_items: [],
  settings: { usd_rate: '12800' }
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
    console.warn('⚠️ [DB] In-Memory rejimida ishlanmoqda.');
  }
}

const query = async (text, params) => {
  console.log(`🔍 [DB Query]: ${text.trim().substring(0, 100)}...`, params);
  
  if (pool) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('❌ [PG Error]:', err.message);
      throw err;
    }
  }
  
  if (sqliteDb) {
    const sql = text.replace(/\$(\d+)/g, '?');
    return new Promise((resolve, reject) => {
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) {
            console.error('❌ [SQLite Error]:', err.message);
            reject(err);
          } else resolve({ rows });
        });
      } else {
        sqliteDb.run(sql, params, function(err) {
          if (err) {
            console.error('❌ [SQLite Error]:', err.message);
            reject(err);
          } else resolve({ rows: [{ id: this.lastID }], rowCount: this.changes });
        });
      }
    });
  }

  // --- FULL IN-MEMORY LOGIC FOR RENDER ---
  const cmd = text.trim().toUpperCase();
  
  // 1. Products
  if (cmd.includes('SELECT * FROM PRODUCTS')) return { rows: memory_storage.products };
  if (cmd.includes('INSERT INTO PRODUCTS')) {
    const newP = { id: Date.now(), code: params[0], name: params[1], dimensions: params[2], piece_volume: params[3], volume: params[4], quantity: params[5], unit: params[6], cost_price_dollar: params[7], sale_price_dollar: params[8] };
    memory_storage.products.push(newP);
    return { rows: [newP] };
  }
  if (cmd.includes('UPDATE PRODUCTS')) {
    const idToFind = params[params.length - 1];
    const p = memory_storage.products.find(x => String(x.id) === String(idToFind));
    if (p) {
      if (cmd.includes('QUANTITY = QUANTITY -')) { // Sale update
        p.quantity -= params[0]; p.volume -= params[1];
      } else if (cmd.includes('QUANTITY = QUANTITY +')) { // Return/Delete update
        p.quantity += params[0]; p.volume += params[1];
      } else { // Generic update
        p.name=params[0]; p.dimensions=params[1]; p.piece_volume=params[2]; p.volume=params[3]; p.quantity=params[4]; p.unit=params[5]; p.cost_price_dollar=params[6]; p.sale_price_dollar=params[7];
      }
    }
    return { rows: [p], rowCount: p ? 1 : 0 };
  }

  // 2. Sales
  if (cmd.includes('SELECT * FROM SALES')) return { rows: memory_storage.sales };
  if (cmd.includes('INSERT INTO SALES')) {
    const newS = { id: Date.now(), client_name: params[0], client_phone: params[1], total_sum: params[2], paid_sum: params[3], debt_sum: params[4], usd_rate: params[5], sold_at: new Date() };
    memory_storage.sales.push(newS);
    return { rows: [newS] };
  }
  if (cmd.includes('INSERT INTO SALE_ITEMS')) {
    const item = { id: Date.now(), sale_id: params[0], product_id: params[1], product_code: params[2], product_name: params[3], qty: params[4], unit: params[5], volume: params[6], price_per_unit_sum: params[7], total_sum: params[8], returned_qty: 0 };
    memory_storage.sale_items.push(item);
    return { rows: [item] };
  }
  if (cmd.includes('SELECT * FROM SALE_ITEMS')) {
    return { rows: memory_storage.sale_items.filter(x => String(x.sale_id) === String(params[0])) };
  }

  // 3. Stats & Settings
  if (cmd.includes('SELECT COUNT(*) AS COUNT FROM PRODUCTS')) return { rows: [{ count: memory_storage.products.length }] };
  if (cmd.includes('SELECT VALUE FROM SETTINGS')) return { rows: [{ value: memory_storage.settings.usd_rate }] };
  if (cmd.includes('SELECT COUNT(*) AS COUNT, SUM(TOTAL_SUM)')) {
    const total = memory_storage.sales.reduce((a,b)=>a+b.total_sum, 0);
    const paid = memory_storage.sales.reduce((a,b)=>a+b.paid_sum, 0);
    const debt = memory_storage.sales.reduce((a,b)=>a+b.debt_sum, 0);
    return { rows: [{ count: memory_storage.sales.length, total, paid, debt }] };
  }

  // 4. Deletions
  if (cmd.includes('DELETE FROM PRODUCTS')) {
    memory_storage.products = memory_storage.products.filter(x => String(x.id) !== String(params[0]));
    return { rows: [], rowCount: 1 };
  }
  if (cmd.includes('DELETE FROM SALES')) {
    memory_storage.sales = memory_storage.sales.filter(x => String(x.id) !== String(params[0]));
    return { rows: [], rowCount: 1 };
  }
  if (cmd.includes('DELETE FROM SALE_ITEMS')) {
    memory_storage.sale_items = memory_storage.sale_items.filter(x => String(x.sale_id) !== String(params[0]));
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
};

module.exports = { query };
