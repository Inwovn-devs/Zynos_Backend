const express = require('express');
const router = express.Router();
const { getBrands, getBrand, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { requireSubAdmin } = require('../middleware/auth');
const { uploadBrand } = require('../middleware/upload');

router.get('/', getBrands);
router.get('/:slug', getBrand);
router.post('/', requireSubAdmin, uploadBrand.single('logo'), createBrand);
router.put('/:id', requireSubAdmin, uploadBrand.single('logo'), updateBrand);
router.delete('/:id', requireSubAdmin, deleteBrand);

module.exports = router;
