const express = require('express');
const router = express.Router();
const { getBanners, getAllBanners, createBanner, updateBanner, deleteBanner } = require('../controllers/bannerController');
const { requireAdmin } = require('../middleware/auth');
const { uploadBanner } = require('../middleware/upload');

router.get('/', getBanners);
router.get('/all', requireAdmin, getAllBanners);
router.post('/', requireAdmin, uploadBanner.single('image'), createBanner);
router.put('/:id', requireAdmin, uploadBanner.single('image'), updateBanner);
router.delete('/:id', requireAdmin, deleteBanner);

module.exports = router;
