const express = require('express');
const router = express.Router();
const {
  createOrder, getMyOrders, getOrder,
  getAllOrders, updateOrderStatus, cancelOrder
} = require('../controllers/orderController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/', requireAuth, createOrder);
router.get('/my', requireAuth, getMyOrders);
router.get('/all', requireAdmin, getAllOrders);
router.get('/', requireAdmin, getAllOrders);
router.get('/:id', requireAuth, getOrder);
router.patch('/:id/status', requireAdmin, updateOrderStatus);
router.patch('/:id/cancel', requireAuth, cancelOrder);

module.exports = router;
