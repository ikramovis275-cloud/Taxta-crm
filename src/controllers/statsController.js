const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const { rows: prodRows } = await db.query('SELECT COUNT(*) as count FROM products');
    const { rows: salesCountRows } = await db.query('SELECT COUNT(*) as count FROM sales');
    const { rows: revRows } = await db.query('SELECT COALESCE(SUM(total_sum), 0) as sum FROM sales');
    const { rows: volRows } = await db.query('SELECT COALESCE(SUM(volume), 0) as vol FROM products');

    const { rows: dailySales } = await db.query(`
      SELECT DATE(sold_at) as date, SUM(total_sum) as total, COUNT(*) as count
      FROM sales
      GROUP BY DATE(sold_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json({
      totalProducts: parseInt(prodRows[0].count || 0),
      totalSales: parseInt(salesCountRows[0].count || 0),
      totalRevenue: parseFloat(revRows[0].sum || 0),
      totalVolume: parseFloat(volRows[0].vol || 0),
      dailySales: dailySales.map(d => ({...d, total: parseFloat(d.total), count: parseInt(d.count)}))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
