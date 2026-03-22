const Category = require('../models/Category');

const generateSlug = (name) => {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim('-');
};

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parent', 'name slug')
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get hierarchical category tree
const getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).lean();

    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => String(cat.parent) === String(parentId) || (!cat.parent && !parentId))
        .map(cat => ({
          ...cat,
          children: buildTree(cat._id),
        }));
    };

    const tree = buildTree(null);
    res.status(200).json({ success: true, categories: tree });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single category
const getCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug }).populate('parent', 'name slug');

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.status(200).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, description, parent, isActive } = req.body;

    let slug = generateSlug(name);
    const existing = await Category.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    let image = '';
    if (req.file) image = req.file.path;

    const category = await Category.create({
      name,
      slug,
      description,
      image,
      parent: parent || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    await category.populate('parent', 'name slug');

    res.status(201).json({ success: true, message: 'Category created', category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (updates.name && updates.name !== category.name) {
      let newSlug = generateSlug(updates.name);
      const existing = await Category.findOne({ slug: newSlug, _id: { $ne: id } });
      if (existing) newSlug = `${newSlug}-${Date.now()}`;
      updates.slug = newSlug;
    }

    if (req.file) updates.image = req.file.path;
    if (updates.parent === '' || updates.parent === 'null') updates.parent = null;

    Object.assign(category, updates);
    await category.save();
    await category.populate('parent', 'name slug');

    res.status(200).json({ success: true, message: 'Category updated', category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.isActive = false;
    await category.save();

    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCategories, getCategoryTree, getCategory, createCategory, updateCategory, deleteCategory };
