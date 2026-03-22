const express = require('express');
const router = express.Router();
const {
  getCategories, getCategoryTree, getCategory,
  createCategory, updateCategory, deleteCategory
} = require('../controllers/categoryController');
const { requireSubAdmin } = require('../middleware/auth');
const { uploadCategory } = require('../middleware/upload');

router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.get('/:slug', getCategory);

router.post('/', requireSubAdmin, uploadCategory.single('image'), createCategory);
router.put('/:id', requireSubAdmin, uploadCategory.single('image'), updateCategory);
router.delete('/:id', requireSubAdmin, deleteCategory);

module.exports = router;
