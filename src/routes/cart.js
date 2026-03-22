const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/cartController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getCart);
router.post('/add', requireAuth, addToCart);
router.put('/item/:itemId', requireAuth, updateCartItem);
router.delete('/item/:itemId', requireAuth, removeFromCart);
router.delete('/clear', requireAuth, clearCart);

module.exports = router;
