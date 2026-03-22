const express = require('express');
const router = express.Router();
const { createRazorpayOrder, verifyPayment, handleWebhook } = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

router.post('/webhook', handleWebhook);
router.post('/create-order', requireAuth, createRazorpayOrder);
router.post('/verify', requireAuth, verifyPayment);

module.exports = router;
