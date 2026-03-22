const express = require('express');
const router = express.Router();
const { syncUser, getMe, updateProfile, getAllUsers, updateUserRole } = require('../controllers/authController');
const { requireAuth, requireAdmin, verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/sync', authLimiter, verifyToken, syncUser);
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);

// Admin routes
router.get('/users', requireAdmin, getAllUsers);
router.put('/users/:userId', requireAdmin, updateUserRole);

module.exports = router;
