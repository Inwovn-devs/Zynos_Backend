const express = require('express');
const router = express.Router();
const { getProductReviews, createReview, deleteReview } = require('../controllers/reviewController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/product/:productId', getProductReviews);
router.post('/', requireAuth, createReview);
router.delete('/:id', requireAdmin, deleteReview);

module.exports = router;
