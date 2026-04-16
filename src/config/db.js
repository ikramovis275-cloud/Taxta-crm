const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL 
  ? { 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Cloud (Render/Neon) uchun shart
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    }
);

pool.on('connect', () => {
  console.log('✅ PostgreSQL bazasiga ulanish muvaffaqiyatli.');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL ulanishida xatolik:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
