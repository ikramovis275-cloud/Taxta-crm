const db = require('../config/db');

exports.getProducts = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  const { code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO products (code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar]);
    
    // Yangi ID ni olish
    const newId = result.rows[0]?.id || Date.now();
    res.status(201).json({ id: newId, code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar });
  } catch (err) {
    if (err.message.toLowerCase().includes('unique')) return res.status(400).json({ error: "Ushbu kodli mahsulot allaqachon mavjud" });
    res.status(500).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar } = req.body;
  try {
    await db.query(`
      UPDATE products SET name=$1, dimensions=$2, piece_volume=$3, volume=$4, quantity=$5, unit=$6, cost_price_dollar=$7, sale_price_dollar=$8
      WHERE id=$9
    `, [name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar, id]);
    
    res.json({ id, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar });
  } catch (err) {
    if (err.message.toLowerCase().includes('unique')) return res.status(400).json({ error: "Ushbu kodli mahsulot allaqachon mavjud" });
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
