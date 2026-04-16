const { Client } = require('pg');
require('dotenv').config();

const ensureDatabaseExists = async () => {
  // Agar Renderda (Production) bo'lsa, bazani tekshirib o'tirmaymiz
  if (process.env.NODE_ENV === 'production') {
    return console.log('✅ Production rejim: Baza tekshiruvi o\'tkazib yuborildi.');
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
      console.error('❌ Xatolik: PostgreSQL paroli noto\'g\'ri! .env faylidagi DB_PASSWORD ni tekshiring.');
    } else {
      console.error('❌ Bazani tekshirishda xatolik:', err.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
};

module.exports = { ensureDatabaseExists };
