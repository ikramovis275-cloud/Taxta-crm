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

if (connectionString) {
  console.log('📡 Ma\'lumotlar bazasiga ulanishga urinilmoqda...');
} else if (process.env.RENDER || process.env.NODE_ENV === 'production') {
  console.warn('❌ DIQQAT: DATABASE_URL topilmadi! Render-da baza ulanmagan.');
}

const query = async (text, params) => {
  if (!connectionString && (process.env.RENDER || process.env.NODE_ENV === 'production')) {
    throw new Error('DATABASE_URL topilmadi! Iltimos Render panelidan kiritasiz.');
  }
  return await pool.query(text, params);
};

module.exports = {
  query,
  pool
};
