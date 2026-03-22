const Wishlist = require('../models/Wishlist');

const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate({
        path: 'products',
        select: 'name slug images price discountPrice ratings brand isActive',
        populate: { path: 'brand', select: 'name' },
      });

    if (!wishlist) {
      return res.status(200).json({ success: true, wishlist: { products: [] } });
    }

    // Filter inactive products
    wishlist.products = wishlist.products.filter(p => p && p.isActive);

    res.status(200).json({ success: true, wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        products: [productId],
      });
    } else {
      if (!wishlist.products.includes(productId)) {
        wishlist.products.push(productId);
        await wishlist.save();
      }
    }

    await wishlist.populate({
      path: 'products',
      select: 'name slug images price discountPrice ratings brand isActive',
      populate: { path: 'brand', select: 'name' },
    });

    res.status(200).json({ success: true, message: 'Added to wishlist', wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    wishlist.products = wishlist.products.filter(p => p.toString() !== productId);
    await wishlist.save();

    await wishlist.populate({
      path: 'products',
      select: 'name slug images price discountPrice ratings brand isActive',
      populate: { path: 'brand', select: 'name' },
    });

    res.status(200).json({ success: true, message: 'Removed from wishlist', wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
