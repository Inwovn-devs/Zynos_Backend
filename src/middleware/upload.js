const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Cloudinary storage for product images
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'zynos/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }],
  },
});

// Cloudinary storage for category images
const categoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'zynos/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto' }],
  },
});

// Cloudinary storage for brand logos
const brandStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'zynos/brands',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    transformation: [{ width: 300, height: 300, crop: 'limit', quality: 'auto' }],
  },
});

// Cloudinary storage for banners
const bannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'zynos/banners',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1920, height: 600, crop: 'limit', quality: 'auto' }],
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed.'), false);
  }
};

const uploadProduct = multer({
  storage: productStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB, max 10 files
});

const uploadCategory = multer({
  storage: categoryStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

const uploadBrand = multer({
  storage: brandStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

const uploadBanner = multer({
  storage: bannerStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

module.exports = { uploadProduct, uploadCategory, uploadBrand, uploadBanner };
