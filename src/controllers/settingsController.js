const db = require('../config/db');

exports.getSettings = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT value FROM settings WHERE key = 'usd_rate'");
    const rate = rows[0];
    res.json({ usd_rate: parseFloat(rate?.value || 12800) });
  } catch (err) {
    res.status(500).json({ error: "Sozlamalarni yuklashda xatolik: " + err.message });
  }
};

exports.updateUsdRate = async (req, res) => {
  const { rate } = req.body;
  if (!rate || isNaN(rate) || rate <= 0) return res.status(400).json({ error: "To'g'ri kurs kiriting" });
  try {
    await db.query(`
      INSERT INTO settings (key, value) 
      VALUES ('usd_rate', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [String(rate)]);
    res.json({ usd_rate: parseFloat(rate) });
  } catch (err) {
    res.status(500).json({ error: "Kursni yangilashda xatolik: " + err.message });
  }
};
