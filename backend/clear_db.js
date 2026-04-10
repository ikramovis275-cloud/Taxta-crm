const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'taxta_crm.db'));

console.log("Bazani tozalash boshlandi...");

try {
  // Truncate tables (Delete all rows)
  db.exec("DELETE FROM sale_items");
  db.exec("DELETE FROM sales");
  db.exec("DELETE FROM products");
  
  // Reset autoincrement sequences
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('sale_items', 'sales', 'products')");
  
  console.log("✅ Mahsulotlar, sotuvlar va cheklar muvaffaqiyatli o'chirildi.");
  console.log("Foydalanuvchilar va sozlamalar o'zgarishsiz qoldi.");
} catch (err) {
  console.error("Xatolik:", err.message);
} finally {
  db.close();
}
