const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get cart
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name slug images price discountPrice variants totalStock isActive brand',
        populate: { path: 'brand', select: 'name' },
      });

    if (!cart) {
      return res.status(200).json({ success: true, cart: { items: [] } });
    }

    // Filter out inactive products
    cart.items = cart.items.filter(item => item.product && item.product.isActive);

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variant } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check stock
    if (variant && (variant.size || variant.color)) {
      const productVariant = product.variants.find(v =>
        (!variant.size || v.size === variant.size) &&
        (!variant.color || v.color === variant.color)
      );
      if (!productVariant || productVariant.stock < quantity) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }
    } else if (product.totalStock < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [{ product: productId, quantity, variant: variant || {} }],
      });
    } else {
      // Check if item already in cart
      const existingItemIndex = cart.items.findIndex(item => {
        const sameProduct = item.product.toString() === productId;
        const sameVariant =
          (!variant || (!variant.size && !variant.color)) ||
          (item.variant?.size === variant?.size && item.variant?.color === variant?.color);
        return sameProduct && sameVariant;
      });

      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity, variant: variant || {} });
      }

      await cart.save();
    }

    await cart.populate({
      path: 'items.product',
      select: 'name slug images price discountPrice variants totalStock brand',
      populate: { path: 'brand', select: 'name' },
    });

    res.status(200).json({ success: true, message: 'Added to cart', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update cart item
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    item.quantity = quantity;
    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name slug images price discountPrice variants totalStock brand',
      populate: { path: 'brand', select: 'name' },
    });

    res.status(200).json({ success: true, message: 'Cart updated', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove from cart
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name slug images price discountPrice variants totalStock brand',
      populate: { path: 'brand', select: 'name' },
    });

    res.status(200).json({ success: true, message: 'Item removed', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
