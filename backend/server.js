const express = require('express');
console.log(">>> Backend v2.1 (Debt Management) starting...");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'taxta_crm_secret_key_2024';

// Middleware
const allowedOrigins = [
  'https://taxta-front.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS: not allowed - ' + origin), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());
app.use(express.json());

// Database
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_UWmLsIOx6AE0@ep-late-rain-acszph2w.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      dimensions TEXT NOT NULL,
      piece_volume REAL NOT NULL,
      volume REAL NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'dona',
      cost_price_dollar REAL NOT NULL,
      sale_price_dollar REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_phone TEXT,
      total_sum REAL NOT NULL,
      paid_sum REAL DEFAULT 0,
      debt_sum REAL DEFAULT 0,
      total_dollar REAL NOT NULL,
      usd_rate REAL NOT NULL,
      sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id SERIAL PRIMARY KEY,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      qty REAL NOT NULL,
      unit TEXT NOT NULL,
      volume REAL NOT NULL,
      price_per_unit_sum REAL NOT NULL,
      total_sum REAL NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Default admin user
  const { rows: users } = await pool.query('SELECT id FROM users WHERE email = $1', ['1983']);
  if (users.length === 0) {
    const hashedPassword = bcrypt.hashSync('1983', 10);
    await pool.query('INSERT INTO users (email, password, name) VALUES ($1, $2, $3)', ['1983', hashedPassword, 'Admin']);
  }

  // Default USD rate
  const { rows: rates } = await pool.query("SELECT value FROM settings WHERE key = 'usd_rate'");
  if (rates.length === 0) {
    await pool.query("INSERT INTO settings (key, value) VALUES ('usd_rate', '12800')");
  }
}

initDB().catch(console.error);

// Root route for health check
app.get('/', (req, res) => {
  res.send('Taxta CRM Backend point is active.');
});

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token talab qilinadi' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token yaroqsiz' });
  }
}

// === AUTH ROUTES ===
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email va parol talab qilinadi' });
  
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) { res.status(500).json({error: err.message}); }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// === SETTINGS ROUTES ===
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'usd_rate'");
    const rate = rows[0];
    res.json({ usd_rate: parseFloat(rate?.value || 12800) });
  } catch (err) { res.status(500).json({error: err.message}); }
});

app.put('/api/settings/usd-rate', authMiddleware, async (req, res) => {
  const { rate } = req.body;
  if (!rate || isNaN(rate) || rate <= 0) return res.status(400).json({ error: "To'g'ri kurs kiriting" });
  try {
    await pool.query(
      "INSERT INTO settings (key, value) VALUES ('usd_rate', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [String(rate)]
    );
    res.json({ usd_rate: parseFloat(rate) });
  } catch (err) { res.status(500).json({error: err.message}); }
});

// === PRODUCTS ROUTES ===
app.get('/api/products', authMiddleware, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY name ASC');
  res.json(rows);
});

app.post('/api/products', authMiddleware, async (req, res) => {
  const { code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar } = req.body;
  if (!code || !name || !dimensions) return res.status(400).json({ error: "Barcha maydonlar to'ldirilishi shart" });
  try {
    const { rows: existing } = await pool.query('SELECT id FROM products WHERE code = $1', [code]);
    if (existing.length > 0) return res.status(400).json({ error: 'Bu koddagi mahsulot mavjud' });
    
    const { rows } = await pool.query(`
      INSERT INTO products (code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar]);
    
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({error: err.message}); }
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE products SET name=$1, dimensions=$2, piece_volume=$3, volume=$4, quantity=$5, unit=$6,
      cost_price_dollar=$7, sale_price_dollar=$8, updated_at=CURRENT_TIMESTAMP WHERE id=$9 RETURNING *
    `, [name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar, id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({error: err.message}); }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM products WHERE id = $1', [id]);
  res.json({ message: "Mahsulot o'chirildi" });
});

// === SALES ROUTES ===
app.get('/api/sales', authMiddleware, async (req, res) => {
  try {
    const { rows: sales } = await pool.query('SELECT * FROM sales ORDER BY sold_at DESC');
    for (let sale of sales) {
      const { rows: items } = await pool.query('SELECT * FROM sale_items WHERE sale_id = $1', [sale.id]);
      sale.items = items;
    }
    res.json(sales);
  } catch (err) { res.status(500).json({error: err.message}); }
});

app.post('/api/sales', authMiddleware, async (req, res) => {
  const { client_name, client_phone, items, usd_rate, paid_sum } = req.body;
  if (!client_name || !items || items.length === 0) return res.status(400).json({ error: "Klient ismi va mahsulotlar talab qilinadi" });

  let totalSum = 0;
  items.forEach(item => { totalSum += Number(item.total_sum) || 0; });
  
  const numTotalSum = totalSum;
  const numUsdRate = Number(usd_rate) || 12800;
  const numTotalDollar = numTotalSum / numUsdRate;
  const numPaid = Number(paid_sum) || 0;
  const numDebtSum = numTotalSum - numPaid;

  try {
    const { rows: saleRows } = await pool.query(`
      INSERT INTO sales (client_name, client_phone, total_sum, paid_sum, debt_sum, total_dollar, usd_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [client_name, client_phone, numTotalSum, numPaid, numDebtSum, numTotalDollar, numUsdRate]);

    const saleId = saleRows[0].id;

    for (const item of items) {
      const numQty = Number(item.qty) || 0;
      const numVol = Number(item.volume) || 0;
      const numPrice = Number(item.price_per_unit_sum) || 0;
      const itemTotal = Number(item.total_sum) || 0;

      await pool.query(`
        INSERT INTO sale_items (sale_id, product_id, product_code, product_name, qty, unit, volume, price_per_unit_sum, total_sum)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [saleId, item.product_id, item.product_code, item.product_name, numQty, item.unit, numVol, numPrice, itemTotal]);

      const { rows: productRows } = await pool.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      const product = productRows[0];
      if (product) {
        const newQty = product.quantity - numQty;
        const newVolume = product.volume - numVol;
        if (newQty <= 0) {
          await pool.query('DELETE FROM products WHERE id = $1', [item.product_id]);
        } else {
          await pool.query('UPDATE products SET quantity=$1, volume=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3',
            [newQty, newVolume, item.product_id]);
        }
      }
    }

    const { rows: createdSale } = await pool.query('SELECT * FROM sales WHERE id = $1', [saleId]);
    const { rows: saleItems } = await pool.query('SELECT * FROM sale_items WHERE sale_id = $1', [saleId]);
    res.status(201).json({ ...createdSale[0], items: saleItems });
  } catch (err) { res.status(500).json({error: err.message}); }
});

app.delete('/api/sales/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
  await pool.query('DELETE FROM sales WHERE id = $1', [id]);
  res.json({ message: "Sotuv o'chirildi" });
});

app.put('/api/sales/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { paid_sum } = req.body;

  try {
    const { rows } = await pool.query('SELECT total_sum FROM sales WHERE id = $1', [id]);
    const sale = rows[0];
    if (!sale) return res.status(404).json({ error: "Sotuv topilmadi" });

    const numPaid = Number(paid_sum);
    const debtSum = sale.total_sum - numPaid;

    await pool.query('UPDATE sales SET paid_sum = $1, debt_sum = $2 WHERE id = $3', [numPaid, debtSum, id]);

    res.json({ message: "To'lov yangilandi", paid_sum: numPaid, debt_sum: debtSum });
  } catch (err) { res.status(500).json({error: err.message}); }
});

app.post('/api/sales/:id/return', authMiddleware, async (req, res) => {
  const { id } = req.params; 
  const { item_id, return_qty, return_volume } = req.body;

  try {
    const { rows: itemRows } = await pool.query('SELECT * FROM sale_items WHERE id = $1 AND sale_id = $2', [item_id, id]);
    const item = itemRows[0];
    if (!item) return res.status(404).json({ error: "Mahsulot topilmadi" });

    const rQty = parseFloat(return_qty);
    const rVol = parseFloat(return_volume);

    if (rQty > item.qty) return res.status(400).json({ error: "Qaytarish miqdori sotilganidan ko'p" });

    await pool.query('UPDATE products SET quantity = quantity + $1, volume = volume + $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [rQty, rVol, item.product_id]);

    const newQty = item.qty - rQty;
    const newVol = item.volume - rVol;
    const refundAmount = rQty * item.price_per_unit_sum;

    if (newQty <= 0) {
      await pool.query('DELETE FROM sale_items WHERE id = $1', [item_id]);
    } else {
      await pool.query('UPDATE sale_items SET qty = $1, volume = $2, total_sum = total_sum - $3 WHERE id = $4',
        [newQty, newVol, refundAmount, item_id]);
    }

    const { rows: saleRows } = await pool.query('SELECT * FROM sales WHERE id = $1', [id]);
    const sale = saleRows[0];
    const newTotalSum = sale.total_sum - refundAmount;
    const newTotalDollar = newTotalSum / sale.usd_rate;

    let newPaidSum = sale.paid_sum;
    let newDebtSum = sale.debt_sum - refundAmount;

    if (newDebtSum < 0) {
      newPaidSum += newDebtSum;
      newDebtSum = 0;
    }

    await pool.query('UPDATE sales SET total_sum = $1, total_dollar = $2, paid_sum = $3, debt_sum = $4 WHERE id = $5',
      [newTotalSum, newTotalDollar, newPaidSum, newDebtSum, id]);

    res.json({ message: "Mahsulot qaytarildi", new_total: newTotalSum });
  } catch (err) { res.status(500).json({error: err.message}); }
});

// Stats
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const { rows: prodRows } = await pool.query('SELECT COUNT(*) as count FROM products');
    const { rows: salesCountRows } = await pool.query('SELECT COUNT(*) as count FROM sales');
    const { rows: revRows } = await pool.query('SELECT COALESCE(SUM(total_sum), 0) as sum FROM sales');
    const { rows: volRows } = await pool.query('SELECT COALESCE(SUM(volume), 0) as vol FROM products');

    const { rows: dailySales } = await pool.query(`
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
  } catch (err) { res.status(500).json({error: err.message}); }
});

app.listen(PORT, () => {
  console.log(\`✅ Backend ishga tushdi: http://localhost:\${PORT}\`);
});

// Server uxlab qolmasligi uchun node-cron yordamida (Self-ping)
const cron = require('node-cron');
const backendUrl = process.env.BACKEND_URL || "https://taxta-crm-2.onrender.com";

cron.schedule('*/3 * * * * *', () => {
  fetch(backendUrl)
    .then(() => console.log(">>> Self-ping (Cron) muvaffaqiyatli: Server uyg'oq! (3s)"))
    .catch((err) => {});
});
