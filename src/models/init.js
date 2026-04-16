const db = require('../config/db');
const bcrypt = require('bcryptjs');

const initModels = async () => {
  try {
    // Users
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

    // Products
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        dimensions TEXT,
        piece_volume REAL,
        volume REAL DEFAULT 0,
        quantity REAL DEFAULT 0,
        unit TEXT DEFAULT 'dona',
        cost_price_dollar REAL DEFAULT 0,
        sale_price_dollar REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sales
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        client_name TEXT NOT NULL,
        client_phone TEXT,
        total_sum REAL DEFAULT 0,
        paid_sum REAL DEFAULT 0,
        debt_sum REAL DEFAULT 0,
        usd_rate REAL DEFAULT 12800,
        sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sale Items
    await db.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER,
        product_id INTEGER,
        product_code TEXT,
        product_name TEXT,
        qty REAL,
        unit TEXT,
        volume REAL,
        price_per_unit_sum REAL,
        total_sum REAL,
        returned_qty REAL DEFAULT 0
      )
    `);

    // Settings
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Admin user 1983
    const hashedPassword = bcrypt.hashSync('1983', 10);
    await db.query(`
      INSERT INTO users (email, password) 
      VALUES ('1983', $1) 
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    // Default USD Rate
    await db.query(`
      INSERT INTO settings (key, value) 
      VALUES ('usd_rate', '12800') 
      ON CONFLICT (key) DO NOTHING
    `);

    console.log('✅ [DB] Barcha jadvallar va boshlang\'ich ma\'lumotlar tayyor.');
  } catch (err) {
    console.error('❌ [DB] Init hatosi:', err.message);
  }
};

module.exports = { initModels };
