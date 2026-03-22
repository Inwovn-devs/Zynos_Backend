const Brand = require('../models/Brand');

const generateSlug = (name) => {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim('-');
};

const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 }).lean();
    res.status(200).json({ success: true, brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBrand = async (req, res) => {
  try {
    const { slug } = req.params;
    const brand = await Brand.findOne({ slug });
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.status(200).json({ success: true, brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createBrand = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    let slug = generateSlug(name);
    const existing = await Brand.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    let logo = '';
    if (req.file) logo = req.file.path;

    const brand = await Brand.create({
      name, slug, description, logo,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, message: 'Brand created', brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const brand = await Brand.findById(id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

    if (updates.name && updates.name !== brand.name) {
      let newSlug = generateSlug(updates.name);
      const existing = await Brand.findOne({ slug: newSlug, _id: { $ne: id } });
      if (existing) newSlug = `${newSlug}-${Date.now()}`;
      updates.slug = newSlug;
    }

    if (req.file) updates.logo = req.file.path;

    Object.assign(brand, updates);
    await brand.save();

    res.status(200).json({ success: true, message: 'Brand updated', brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

    brand.isActive = false;
    await brand.save();

    res.status(200).json({ success: true, message: 'Brand deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBrands, getBrand, createBrand, updateBrand, deleteBrand };
