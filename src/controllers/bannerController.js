const Banner = require('../models/Banner');

const getBanners = async (req, res) => {
  try {
    const { position } = req.query;
    const query = { isActive: true };
    if (position) query.position = position;

    const banners = await Banner.find(query).sort({ order: 1, createdAt: -1 });
    res.status(200).json({ success: true, banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
    res.status(200).json({ success: true, banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createBanner = async (req, res) => {
  try {
    const { title, subtitle, link, position, isActive, order } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Banner image is required' });
    }

    const banner = await Banner.create({
      title,
      subtitle,
      image: req.file.path,
      link,
      position: position || 'hero',
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
    });

    res.status(201).json({ success: true, message: 'Banner created', banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const banner = await Banner.findById(id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    if (req.file) updates.image = req.file.path;

    Object.assign(banner, updates);
    await banner.save();

    res.status(200).json({ success: true, message: 'Banner updated', banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    res.status(200).json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBanners, getAllBanners, createBanner, updateBanner, deleteBanner };
