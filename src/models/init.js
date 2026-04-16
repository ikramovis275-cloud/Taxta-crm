const db = require('../config/db');

const initModels = async () => {
  try {
    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Products table
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        dimensions TEXT NOT NULL,
        piece_volume REAL NOT NULL,
        volume REAL NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'dona',
        cost_price_dollar REAL NOT NULL,
        sale_price_dollar REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sales table
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        client_name TEXT NOT NULL,
        client_phone TEXT,
        total_sum REAL NOT NULL,
        paid_sum REAL DEFAULT 0,
        debt_sum REAL DEFAULT 0,
        total_dollar REAL NOT NULL,
        usd_rate REAL NOT NULL,
        sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sale items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_code TEXT NOT NULL,
        product_name TEXT NOT NULL,
        qty REAL NOT NULL,
        unit TEXT NOT NULL,
        volume REAL NOT NULL,
        price_per_unit_sum REAL NOT NULL,
        total_sum REAL NOT NULL
      );
    `);

    // Settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('1983', 10);
    await db.query(`
      INSERT INTO users (email, password, name) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
    `, ['1983', hashedPassword, 'Admin']);

    // Default USD rate
    const { rows: rates } = await db.query("SELECT value FROM settings WHERE key = 'usd_rate'");
    if (rates.length === 0) {
      await db.query("INSERT INTO settings (key, value) VALUES ('usd_rate', '12800')");
    }

    console.log('✅ Ma\'lumotlar bazasi jadvallari va admin tekshirildi.');
  } catch (err) {
    console.error('❌ Modelni yuklashda (Table creation) xatolik:', err.message);
    throw err; // Xatoni yuqoriga uzatamiz
  }
};

module.exports = { initModels };
