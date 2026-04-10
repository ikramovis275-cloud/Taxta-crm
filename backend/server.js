const express = require('express');
console.log(">>> Backend v2.1 (Debt Management) starting...");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

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
    // Allow requests with no origin (mobile apps, curl, etc.)
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

// Handle preflight OPTIONS requests explicitly
app.options('*', cors());

app.use(express.json());

// Database
const db = new Database(path.join(__dirname, 'taxta_crm.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    dimensions TEXT NOT NULL,
    piece_volume REAL NOT NULL,
    volume REAL NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'dona',
    cost_price_dollar REAL NOT NULL,
    sale_price_dollar REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    total_sum REAL NOT NULL,
    paid_sum REAL DEFAULT 0,
    debt_sum REAL DEFAULT 0,
    total_dollar REAL NOT NULL,
    usd_rate REAL NOT NULL,
    sold_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    qty REAL NOT NULL,
    unit TEXT NOT NULL,
    volume REAL NOT NULL,
    price_per_unit_sum REAL NOT NULL,
    total_sum REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Root route for health check
app.get('/', (req, res) => {
  res.send('Taxta CRM Backend point is active.');
});

// Default admin user
const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('1983');
if (!existingUser) {
  const hashedPassword = bcrypt.hashSync('1983', 10);
  db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)').run('1983', hashedPassword, 'Admin');
}

// Default USD rate
const existingRate = db.prepare("SELECT value FROM settings WHERE key = 'usd_rate'").get();
if (!existingRate) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('usd_rate', '12800')").run();
}

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
app.post('/api/auth/login', (req, res) => {
  console.log("Login request received:", req.body);
  const { email, password } = req.body;
  if (!email || !password) {
    console.log("Error: email or password missing");
    return res.status(400).json({ error: 'Email va parol talab qilinadi' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
  }
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// === SETTINGS ROUTES ===
app.get('/api/settings', authMiddleware, (req, res) => {
  const rate = db.prepare("SELECT value FROM settings WHERE key = 'usd_rate'").get();
  res.json({ usd_rate: parseFloat(rate?.value || 12800) });
});

app.put('/api/settings/usd-rate', authMiddleware, (req, res) => {
  const { rate } = req.body;
  if (!rate || isNaN(rate) || rate <= 0) {
    return res.status(400).json({ error: "To'g'ri kurs kiriting" });
  }
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('usd_rate', ?)").run(String(rate));
  res.json({ usd_rate: parseFloat(rate) });
});

// === PRODUCTS ROUTES ===
app.get('/api/products', authMiddleware, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY name ASC').all();
  res.json(products);
});

app.post('/api/products', authMiddleware, (req, res) => {
  const { code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar } = req.body;
  if (!code || !name || !dimensions) {
    return res.status(400).json({ error: "Barcha maydonlar to'ldirilishi shart" });
  }
  const existing = db.prepare('SELECT id FROM products WHERE code = ?').get(code);
  if (existing) {
    return res.status(400).json({ error: 'Bu koddagi mahsulot mavjud' });
  }
  const result = db.prepare(`
    INSERT INTO products (code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar } = req.body;
  db.prepare(`
    UPDATE products SET name=?, dimensions=?, piece_volume=?, volume=?, quantity=?, unit=?,
    cost_price_dollar=?, sale_price_dollar=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(name, dimensions, piece_volume, volume, quantity, unit, cost_price_dollar, sale_price_dollar, id);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json(product);
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ message: "Mahsulot o'chirildi" });
});

// === SALES ROUTES ===
app.get('/api/sales', authMiddleware, (req, res) => {
  const sales = db.prepare('SELECT * FROM sales ORDER BY sold_at DESC').all();
  const result = sales.map(sale => {
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
    return { ...sale, items };
  });
  res.json(result);
});

app.post('/api/sales', authMiddleware, (req, res) => {
  const { client_name, client_phone, items, usd_rate, paid_sum } = req.body;
  if (!client_name || !items || items.length === 0) {
    return res.status(400).json({ error: "Klient ismi va mahsulotlar talab qilinadi" });
  }

  let totalSum = 0;
  items.forEach(item => { totalSum += Number(item.total_sum) || 0; });
  
  const numTotalSum = totalSum;
  const numUsdRate = Number(usd_rate) || 12800;
  const numTotalDollar = numTotalSum / numUsdRate;
  const numPaid = Number(paid_sum) || 0;
  const numDebtSum = numTotalSum - numPaid;

  const saleResult = db.prepare(`
    INSERT INTO sales (client_name, client_phone, total_sum, paid_sum, debt_sum, total_dollar, usd_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(client_name, client_phone, numTotalSum, numPaid, numDebtSum, numTotalDollar, numUsdRate);

  const saleId = saleResult.lastInsertRowid;

  for (const item of items) {
    const numQty = Number(item.qty) || 0;
    const numVol = Number(item.volume) || 0;
    const numPrice = Number(item.price_per_unit_sum) || 0;
    const itemTotal = Number(item.total_sum) || 0;

    db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, product_code, product_name, qty, unit, volume, price_per_unit_sum, total_sum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(saleId, item.product_id, item.product_code, item.product_name, numQty, item.unit, numVol, numPrice, itemTotal);

    // Ombordan ayirish
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
    if (product) {
      const newQty = product.quantity - numQty;
      const newVolume = product.volume - numVol;
      if (newQty <= 0) {
        db.prepare('DELETE FROM products WHERE id = ?').run(item.product_id);
      } else {
        db.prepare('UPDATE products SET quantity=?, volume=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .run(newQty, newVolume, item.product_id);
      }
    }
  }

  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
  const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
  res.status(201).json({ ...sale, items: saleItems });
});

app.delete('/api/sales/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id);
  db.prepare('DELETE FROM sales WHERE id = ?').run(id);
  res.json({ message: "Sotuv o'chirildi" });
});

app.put('/api/sales/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { paid_sum } = req.body;

  const sale = db.prepare('SELECT total_sum FROM sales WHERE id = ?').get(id);
  if (!sale) return res.status(404).json({ error: "Sotuv topilmadi" });

  const numPaid = Number(paid_sum);
  const debtSum = sale.total_sum - numPaid;

  db.prepare('UPDATE sales SET paid_sum = ?, debt_sum = ? WHERE id = ?')
    .run(numPaid, debtSum, id);

  res.json({ message: "To'lov yangilandi", paid_sum: numPaid, debt_sum: debtSum });
});

app.post('/api/sales/:id/return', authMiddleware, (req, res) => {
  const { id } = req.params; // sale_id
  const { item_id, return_qty, return_volume } = req.body;

  const item = db.prepare('SELECT * FROM sale_items WHERE id = ? AND sale_id = ?').get(item_id, id);
  if (!item) return res.status(404).json({ error: "Mahsulot topilmadi" });

  const rQty = parseFloat(return_qty);
  const rVol = parseFloat(return_volume);

  if (rQty > item.qty) return res.status(400).json({ error: "Qaytarish miqdori sotilganidan ko'p" });

  // 1. Omborni yangilash
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
  if (product) {
    db.prepare('UPDATE products SET quantity = quantity + ?, volume = volume + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(rQty, rVol, item.product_id);
  } else {
    // Agar mahsulot o'chirib tashlangan bo'lsa, qayta yaratish (ixtiyoriy, lekin yaxshi)
    // Bu misolda biz faqat mavjud bo'lsa yangilaymiz.
  }

  // 2. Sale Item ni yangilash yoki o'chirish
  const newQty = item.qty - rQty;
  const newVol = item.volume - rVol;
  const refundAmount = rQty * item.price_per_unit_sum;

  if (newQty <= 0) {
    db.prepare('DELETE FROM sale_items WHERE id = ?').run(item_id);
  } else {
    db.prepare('UPDATE sale_items SET qty = ?, volume = ?, total_sum = total_sum - ? WHERE id = ?')
      .run(newQty, newVol, refundAmount, item_id);
  }

  // 3. Sale jami summasini va qarzini yangilash
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
  const newTotalSum = sale.total_sum - refundAmount;
  const newTotalDollar = newTotalSum / sale.usd_rate;

  let newPaidSum = sale.paid_sum;
  let newDebtSum = sale.debt_sum - refundAmount;

  if (newDebtSum < 0) {
    newPaidSum += newDebtSum;
    newDebtSum = 0;
  }

  db.prepare('UPDATE sales SET total_sum = ?, total_dollar = ?, paid_sum = ?, debt_sum = ? WHERE id = ?')
    .run(newTotalSum, newTotalDollar, newPaidSum, newDebtSum, id);

  res.json({ message: "Mahsulot qaytarildi", new_total: newTotalSum });
});


// Stats
app.get('/api/stats', authMiddleware, (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
  const totalSalesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get();
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_sum), 0) as sum FROM sales').get();
  const totalVolume = db.prepare('SELECT COALESCE(SUM(volume), 0) as vol FROM products').get();

  const dailySales = db.prepare(`
    SELECT DATE(sold_at) as date, SUM(total_sum) as total, COUNT(*) as count
    FROM sales
    GROUP BY DATE(sold_at)
    ORDER BY date DESC
    LIMIT 30
  `).all();

  res.json({
    totalProducts: totalProducts.count,
    totalSales: totalSalesCount.count,
    totalRevenue: totalRevenue.sum,
    totalVolume: totalVolume.vol,
    dailySales
  });
});

// Run migrations safely
const migrations = [
  "ALTER TABLE sales ADD COLUMN client_phone TEXT",
  "ALTER TABLE sales ADD COLUMN paid_sum REAL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN debt_sum REAL DEFAULT 0"
];

migrations.forEach(sql => {
  try { db.prepare(sql).run(); } catch (e) { }
});

app.listen(PORT, () => {
  console.log(`✅ Backend ishga tushdi: http://localhost:${PORT}`);
});

// Server uxlab qolmasligi uchun (Self-ping)
// Har 10 daqiqada o'zini o'zi chaqirib turadi
const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
setInterval(() => {
  fetch(backendUrl)
    .then(() => console.log(">>> Self-ping muvaffaqiyatli: Server uyg'oq!"))
    .catch((err) => console.log(">>> Self-pingda xatolik:", err.message));
}, 10 * 60 * 1000); // 10 daqiqa
