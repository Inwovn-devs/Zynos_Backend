const express = require('express');
const router = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getWishlist);
router.post('/add', requireAuth, addToWishlist);
router.delete('/:productId', requireAuth, removeFromWishlist);

module.exports = router;
