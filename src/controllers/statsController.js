const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const { rows: prodRows } = await db.query('SELECT COUNT(*) as count FROM products');
    const { rows: salesRows } = await db.query('SELECT COUNT(*) as count, SUM(total_sum) as total, SUM(paid_sum) as paid, SUM(debt_sum) as debt FROM sales');
    
    res.json({
      totalProducts: parseInt(prodRows[0]?.count || 0),
      totalSalesCount: parseInt(salesRows[0]?.count || 0),
      totalSalesSum: parseFloat(salesRows[0]?.total || 0),
      totalPaid: parseFloat(salesRows[0]?.paid || 0),
      totalDebt: parseFloat(salesRows[0]?.debt || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
