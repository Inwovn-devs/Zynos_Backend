const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, getProductById, createProduct,
  updateProduct, deleteProduct, uploadImages, deleteImage
} = require('../controllers/productController');
const { requireAuth, requireSubAdmin } = require('../middleware/auth');
const { uploadProduct } = require('../middleware/upload');

// Public routes
router.get('/', getProducts);
router.get('/id/:id', getProductById);
router.get('/:slug', getProduct);

// Admin routes
router.post('/', requireSubAdmin, uploadProduct.array('images', 10), createProduct);
router.put('/:id', requireSubAdmin, uploadProduct.array('images', 10), updateProduct);
router.delete('/:id', requireSubAdmin, deleteProduct);
router.post('/upload/images', requireSubAdmin, uploadProduct.array('images', 10), uploadImages);
router.delete('/:id/images', requireSubAdmin, deleteImage);

module.exports = router;
