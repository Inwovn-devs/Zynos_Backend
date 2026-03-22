const Order = require('../models/Order');
const shiprocketService = require('../services/shiprocketService');

// Create shipment for an order
const createShipment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate('user', 'email');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const result = await shiprocketService.createOrder({
      orderNumber: order.orderNumber,
      shippingAddress: order.shippingAddress,
      items: order.items,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      userEmail: order.user?.email || '',
    });

    order.shiprocketOrderId = result.shiprocketOrderId;
    if (result.trackingId) order.trackingId = result.trackingId;
    order.orderStatus = 'processing';
    order.statusHistory.push({
      status: 'processing',
      timestamp: new Date(),
      note: 'Shipment created',
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Shipment created successfully',
      shipment: result,
      order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Track order
const trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check access
    if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let trackingData;
    if (order.shiprocketOrderId) {
      trackingData = await shiprocketService.trackShipment(order.shiprocketOrderId);
    } else {
      trackingData = {
        message: 'Tracking not available',
        orderStatus: order.orderStatus,
        statusHistory: order.statusHistory,
      };
    }

    res.status(200).json({
      success: true,
      tracking: trackingData,
      order: {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        trackingId: order.trackingId,
        statusHistory: order.statusHistory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createShipment, trackOrder };
