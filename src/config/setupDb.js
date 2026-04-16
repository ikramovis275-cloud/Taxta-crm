const { Client } = require('pg');
require('dotenv').config();

const ensureDatabaseExists = async () => {
  // Agar Renderda bo'lsak yoki DATABASE_URL bo'lsa - hech narsani tekshirmaymiz
  if (process.env.RENDER || process.env.DATABASE_URL || process.env.NODE_ENV === 'production') {
    return; 
  }

  // Faqat localhostda ishlaydi
  if (process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') {
    return;
  }

  const dbName = process.env.DB_NAME;

  // Postgres default bazasiga ulanamiz (yangi baza yaratish uchun)
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: 'postgres' // Tizim bazasi
  });

  try {
    await client.connect();

    // Baza bormi yoki yo'qligini tekshiramiz
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

    if (res.rowCount === 0) {
      console.log(`📡 '${dbName}' bazasi topilmadi. Yaratilmoqda...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ '${dbName}' bazasi muvaffaqiyatli yaratildi.`);
    } else {
      console.log(`✅ '${dbName}' bazasi allaqachon mavjud.`);
    }
  } catch (err) {
    if (err.code === '28P01') {
      console.error('❌ Xatolik: PostgreSQL paroli noto\'g\'ri!');
    } else {
      console.error('❌ Bazani tekshirishda xatolik:', err.message);
    }
    // process.exit(1); // O'chirib tashlaymiz
  } finally {
    await client.end();
  }
};

module.exports = { ensureDatabaseExists };
