require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initModels } = require('./src/models/init');
const { ensureDatabaseExists } = require('./src/config/setupDb');
const routes = require('./src/routes');
const { swaggerUi, swaggerDocs } = require('./src/docs/swagger');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true
}));

// Logger: Har bir so'rovni terminalda ko'rish uchun
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use('/api', routes);

// Health check
app.get('/', (req, res) => {
  res.send('✅ Taxta CRM Backend Professional structure is active.');
});

// Start Server
const start = async () => {
  try {
    await ensureDatabaseExists();
    await initModels();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server ishga tushdi: http://localhost:${PORT}`);
      console.log(`📖 Swagger docs: http://localhost:${PORT}/api-docs`);
    });

    // Server uxlab qolmasligi uchun (Cron Keep-alive)
    const cron = require('node-cron');
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
    cron.schedule('*/3 * * * * *', () => {
      fetch(backendUrl)
        .then(() => console.log("📡 [Cron] Self-ping muvaffaqiyatli (3s)"))
        .catch((err) => { });
    });
  } catch (err) {
    console.error('❌ Serverni boshlashda xatolik:', err);
    // process.exit(1);
  }
};

start();
