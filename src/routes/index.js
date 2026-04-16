const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const saleController = require('../controllers/saleController');
const statsController = require('../controllers/statsController');
const settingsController = require('../controllers/settingsController');

const auth = require('../config/auth');

// Auth
router.post('/auth/login', authController.login);
router.get('/auth/me', auth, authController.getMe);

// Products
router.get('/products', auth, productController.getProducts);
router.post('/products', auth, productController.createProduct);
router.put('/products/:id', auth, productController.updateProduct);
router.delete('/products/:id', auth, productController.deleteProduct);

// Sales
router.get('/sales', auth, saleController.getSales);
router.post('/sales', auth, saleController.createSale);
router.put('/sales/:id', auth, saleController.updateSalePayment);
router.post('/sales/:id/return', auth, saleController.returnItem);
router.delete('/sales/:id', auth, saleController.deleteSale);

// Stats
router.get('/stats', auth, statsController.getStats);

// Settings
router.get('/settings', auth, settingsController.getSettings);
router.put('/settings/usd-rate', auth, settingsController.updateUsdRate);

module.exports = router;
