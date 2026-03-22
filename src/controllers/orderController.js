const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');

// Create order
const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod = 'razorpay',
      couponCode,
      razorpayOrderId,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    // Validate items and deduct stock
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, message: `Product ${item.product} not found or inactive` });
      }

      // Find variant and check stock
      if (item.variant && (item.variant.size || item.variant.color)) {
        const variant = product.variants.find(v =>
          (!item.variant.size || v.size === item.variant.size) &&
          (!item.variant.color || v.color === item.variant.color)
        );

        if (!variant) {
          return res.status(400).json({ success: false, message: `Variant not found for ${product.name}` });
        }

        if (variant.stock < item.quantity) {
          return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
        }

        // Deduct stock
        variant.stock -= item.quantity;
      } else {
        if (product.totalStock < item.quantity) {
          return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
        }
        product.totalStock -= item.quantity;
      }

      await product.save();

      const itemPrice = product.discountPrice > 0 ? product.discountPrice : product.price;
      subtotal += itemPrice * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0] || '',
        price: itemPrice,
        quantity: item.quantity,
        variant: item.variant || {},
      });
    }

    // Apply coupon
    let discount = 0;
    let couponData = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        const now = new Date();
        if (!coupon.expiresAt || coupon.expiresAt > now) {
          if (subtotal >= coupon.minOrderValue) {
            if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
              if (coupon.discountType === 'percentage') {
                discount = (subtotal * coupon.discountValue) / 100;
                if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
              } else {
                discount = coupon.discountValue;
              }
              coupon.usedCount += 1;
              await coupon.save();
              couponData = { code: coupon.code, discount };
            }
          }
        }
      }
    }

    const shippingCharge = subtotal - discount >= 999 ? 0 : 99;
    const tax = Math.round((subtotal - discount) * 0.18 * 100) / 100;
    const total = subtotal - discount + shippingCharge + tax;

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      razorpayOrderId: razorpayOrderId || null,
      coupon: couponData,
      discount,
      subtotal,
      shippingCharge,
      tax,
      total: Math.round(total * 100) / 100,
      orderStatus: 'pending',
      statusHistory: [{ status: 'pending', timestamp: new Date() }],
    });

    // Clear cart after order creation
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

    await order.populate('items.product', 'name images');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my orders
const getMyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.product', 'name images slug'),
      Order.countDocuments({ user: req.user._id }),
    ]);

    res.status(200).json({
      success: true,
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate('items.product', 'name images slug');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Users can only see their own orders, admins can see all
    if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get all orders
const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    const query = {};
    if (status) query.orderStatus = status;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'displayName email')
        .populate('items.product', 'name images'),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, trackingId, shiprocketOrderId, note } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = orderStatus;

    if (trackingId) order.trackingId = trackingId;
    if (shiprocketOrderId) order.shiprocketOrderId = shiprocketOrderId;

    // Update payment status if delivered
    if (orderStatus === 'delivered') {
      order.paymentStatus = 'paid';
    }

    order.statusHistory.push({
      status: orderStatus,
      timestamp: new Date(),
      note: note || `Status changed from ${previousStatus} to ${orderStatus}`,
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (['shipped', 'delivered'].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel shipped/delivered orders' });
    }

    order.orderStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: 'Order cancelled by user',
    });

    // Restore stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        if (item.variant && (item.variant.size || item.variant.color)) {
          const variant = product.variants.find(v =>
            (!item.variant.size || v.size === item.variant.size) &&
            (!item.variant.color || v.color === item.variant.color)
          );
          if (variant) variant.stock += item.quantity;
        } else {
          product.totalStock += item.quantity;
        }
        await product.save();
      }
    }

    await order.save();

    res.status(200).json({ success: true, message: 'Order cancelled', order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder, getMyOrders, getOrder, getAllOrders, updateOrderStatus, cancelOrder,
};
