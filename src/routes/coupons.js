const express = require('express');
const router = express.Router();
const { validateCoupon, getCoupons, createCoupon, updateCoupon, deleteCoupon } = require('../controllers/couponController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/validate', requireAuth, validateCoupon);
router.get('/', requireAdmin, getCoupons);
router.post('/', requireAdmin, createCoupon);
router.put('/:id', requireAdmin, updateCoupon);
router.delete('/:id', requireAdmin, deleteCoupon);

module.exports = router;
