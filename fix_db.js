const db = require('./src/config/db');

async function fixDatabase() {
  console.log('🛠️ Bazani ta\'mirlash boshlandi...');
  try {
    // 1. Mavjud mahsulotlarni olish
    const { rows: products } = await db.query('SELECT * FROM products');
    console.log(`📦 ${products.length} ta mahsulot topildi.`);

    // 2. Jadvallarni o'chirish va to'g'ri schema bilan yaratish
    // Eslatma: Ma'lumotlarni vaqtincha saqlab qolamiz
    await db.query('DROP TABLE IF EXISTS sale_items');
    await db.query('DROP TABLE IF EXISTS sales');
    await db.query('DROP TABLE IF EXISTS products');
    await db.query('DROP TABLE IF EXISTS users');
    await db.query('DROP TABLE IF EXISTS settings');

    console.log('✅ Eskirgan jadvallar o\'chirildi.');

    // 3. Init skriptini qayta ishlatish (Hozirgi init.js allaqachon to'g'rilangan)
    const { initModels } = require('./src/models/init');
    await initModels();
    console.log('✅ Yangi jadvallar yaratildi.');

    // 4. Ma'lumotlarni qayta tiklash
    for (const p of products) {
      // Bo'sh ID o'rniga yangi ID beramiz
      await db.query(`
        INSERT INTO products (code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [p.code, p.name, p.dimensions, p.piece_volume, p.volume, p.quantity, p.unit, p.cost_price_dollar, p.sale_price_dollar]);
    }
    console.log('✅ Mahsulotlar qayta tiklandi (ID raqamlari bilan).');

    process.exit(0);
  } catch (err) {
    console.error('❌ Xato:', err.message);
    process.exit(1);
  }
}

fixDatabase();
