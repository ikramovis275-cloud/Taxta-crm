const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const saleController = require('../controllers/saleController');
const statsController = require('../controllers/statsController');
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../config/auth');

// Public
router.post('/auth/login', authController.login);

// Private (Token kerak)
router.use(authMiddleware);

// Products
router.get('/products', productController.getProducts);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// Sales
router.get('/sales', saleController.getSales);
router.post('/sales', saleController.createSale);
router.put('/sales/:id', saleController.updateSale);
router.delete('/sales/:id', saleController.deleteSale);
router.post('/sales/:id/return', saleController.returnItem);

// Stats & Settings
router.get('/stats', statsController.getStats);
router.get('/settings', settingsController.getSettings);
router.put('/settings/usd-rate', settingsController.updateUsdRate);

module.exports = router;
