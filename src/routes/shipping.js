const express = require('express');
const router = express.Router();
const { createShipment, trackOrder } = require('../controllers/shiprocketController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/create', requireAdmin, createShipment);
router.get('/track/:orderId', requireAuth, trackOrder);

module.exports = router;
