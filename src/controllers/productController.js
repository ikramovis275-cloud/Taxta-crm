const db = require('../config/db');

exports.getProducts = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Mahsulotlarni yuklashda xatolik: " + err.message });
  }
};

exports.createProduct = async (req, res) => {
  const { code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar } = req.body;
  
  if (!code || !name || !dimensions) {
    return res.status(400).json({ error: "Barcha maydonlar to'ldirilishi shart" });
  }

  try {
    const { rows: existing } = await db.query('SELECT id FROM products WHERE code = $1', [code]);
    if (existing.length > 0) return res.status(400).json({ error: 'Bu koddagi mahsulot mavjud' });

    const { rows } = await db.query(`
      INSERT INTO products (code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar]);

    if (!rows[0]) throw new Error("Mahsulotni saqlashda xatolik yuz berdi");
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar } = req.body;

  try {
    const { rows } = await db.query(`
      UPDATE products SET name=$1, dimensions=$2, piece_volume=$3, volume=$4, quantity=$5, unit=$6,
      cost_price_dollar=$7, sale_price_dollar=$8, updated_at=CURRENT_TIMESTAMP WHERE id=$9 RETURNING *
    `, [name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar, id]);
    
    if (rows.length === 0) return res.status(404).json({ error: "Mahsulot topilmadi" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: "Mahsulot o'chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
