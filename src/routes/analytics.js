const express = require('express');
const router = express.Router();
const { getSalesOverview, getRevenueStats, getOrderTrends, getTopProducts } = require('../controllers/analyticsController');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);
router.get('/sales-overview', getSalesOverview);
router.get('/revenue', getRevenueStats);
router.get('/order-trends', getOrderTrends);
router.get('/top-products', getTopProducts);

module.exports = router;
