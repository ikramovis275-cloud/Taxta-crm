const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const { rows: products } = await db.query('SELECT * FROM products');
    const { rows: sales } = await db.query('SELECT * FROM sales');

    const totalProducts = products.length;
    const totalVolume = products.reduce((acc, p) => acc + (parseFloat(p.volume) || 0), 0);

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((acc, s) => acc + (parseFloat(s.total_sum) || 0), 0);

    const dailyMap = {};
    sales.forEach(s => {
      const dateObj = s.sold_at ? new Date(s.sold_at) : new Date();
      const dateStr = dateObj.toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, count: 0, total: 0 };
      }
      dailyMap[dateStr].count += 1;
      dailyMap[dateStr].total += (parseFloat(s.total_sum) || 0);
    });

    const dailySales = Object.values(dailyMap).sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      totalProducts,
      totalSales,
      totalVolume,
      totalRevenue,
      dailySales
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
