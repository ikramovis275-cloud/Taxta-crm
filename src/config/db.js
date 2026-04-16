const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.PGURL || process.env.URL;

const pool = new Pool(
  connectionString 
  ? { 
      connectionString: connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    }
);

if (!connectionString && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ DIQQAT: Production rejimda DATABASE_URL topilmadi! Localhostga ulanishga urinilmoqda...');
}

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
