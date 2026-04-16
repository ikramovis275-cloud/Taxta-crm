require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initModels } = require('./src/models/init');
const routes = require('./src/routes');
const { swaggerUi, swaggerDocs } = require('./src/docs/swagger');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('✅ Taxta CRM Backend Professional Running.');
});

// Start
const start = async () => {
  await initModels();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server ishga tushdi: http://localhost:${PORT}`);
  });

  // Keep-alive Cron
  const cron = require('node-cron');
  const backendUrl = process.env.BACKEND_URL || `https://taxta-crm-8.onrender.com`;
  cron.schedule('*/3 * * * * *', () => {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    fetch(backendUrl).catch(() => {});
  });
};

start();
