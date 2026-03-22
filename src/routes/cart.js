const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/cartController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getCart);
router.post('/', requireAuth, addToCart);
router.put('/', requireAuth, updateCartItem);
router.delete('/all', requireAuth, clearCart);
router.delete('/', requireAuth, removeFromCart);

module.exports = router;
