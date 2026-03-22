const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');

// Helper to generate slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

// Get all products with filters
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sort = 'createdAt',
      order = 'desc',
      featured,
      size,
      color,
      tags,
    } = req.query;

    const query = { isActive: true };

    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (featured) query.isFeatured = true;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      query.$text = { $search: search };
    }

    if (size) {
      query['variants.size'] = size;
    }

    if (color) {
      query['variants.color'] = { $regex: color, $options: 'i' };
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagArray };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sortObj = {};
    if (sort === 'price') {
      sortObj.price = order === 'asc' ? 1 : -1;
    } else if (sort === 'rating') {
      sortObj['ratings.average'] = -1;
    } else if (sort === 'name') {
      sortObj.name = order === 'asc' ? 1 : -1;
    } else {
      sortObj.createdAt = -1;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .populate('brand', 'name slug logo')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single product by slug
const getProduct = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug, isActive: true })
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get product by ID (admin)
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create product
const createProduct = async (req, res) => {
  try {
    const {
      name, description, price, discountPrice,
      category, brand, tags, variants, isFeatured, specifications, totalStock
    } = req.body;

    let slug = generateSlug(name);

    // Ensure unique slug
    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Handle uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => file.path);
    }

    // Parse variants if stringified
    let parsedVariants = variants;
    if (typeof variants === 'string') {
      parsedVariants = JSON.parse(variants);
    }

    // Parse specifications if stringified
    let parsedSpecs = specifications;
    if (typeof specifications === 'string') {
      parsedSpecs = JSON.parse(specifications);
    }

    const product = await Product.create({
      name,
      slug,
      description,
      price: parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : 0,
      category,
      brand: brand || null,
      images,
      variants: parsedVariants || [],
      // if no variants, use manually provided totalStock
      totalStock: (!parsedVariants || parsedVariants.length === 0) && totalStock
        ? parseInt(totalStock)
        : undefined,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isActive: req.body.isActive === 'false' ? false : true,
      specifications: parsedSpecs || {},
    });

    await product.populate('category', 'name slug');
    await product.populate('brand', 'name slug logo');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Update slug if name changed
    if (updates.name && updates.name !== product.name) {
      let newSlug = generateSlug(updates.name);
      const existingSlug = await Product.findOne({ slug: newSlug, _id: { $ne: id } });
      if (existingSlug) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      updates.slug = newSlug;
    }

    // Handle images: keep existing (sent from frontend) + add newly uploaded
    const kept = req.body.existingImages
      ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages])
      : product.images || [];

    const newUploads = req.files && req.files.length > 0
      ? req.files.map(file => file.path)
      : [];

    updates.images = [...kept, ...newUploads];

    // Parse variants if stringified
    if (updates.variants && typeof updates.variants === 'string') {
      updates.variants = JSON.parse(updates.variants);
    }

    // Parse specifications if stringified
    if (updates.specifications && typeof updates.specifications === 'string') {
      updates.specifications = JSON.parse(updates.specifications);
    }

    // Handle tags
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(t => t.trim());
    }

    Object.assign(product, updates);
    await product.save();

    await product.populate('category', 'name slug');
    await product.populate('brand', 'name slug logo');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload product images
const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded' });
    }

    const imageUrls = req.files.map(file => file.path);

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      images: imageUrls,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete product image
const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete from Cloudinary
    const publicId = imageUrl.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`zynos/products/${publicId}`);

    // Remove from product images array
    product.images = product.images.filter(img => img !== imageUrl);
    await product.save();

    res.status(200).json({ success: true, message: 'Image deleted successfully', product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  getProduct,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImages,
  deleteImage,
};
