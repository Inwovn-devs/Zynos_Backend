const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// Sales overview
const getSalesOverview = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      totalOrders,
      thisMonthOrders,
      totalUsers,
      newUsers,
      totalProducts,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Product.countDocuments({ isActive: true }),
    ]);

    const thisMonthRev = thisMonthRevenue[0]?.total || 0;
    const lastMonthRev = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = lastMonthRev > 0
      ? ((thisMonthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1)
      : 100;

    res.status(200).json({
      success: true,
      overview: {
        totalRevenue: totalRevenue[0]?.total || 0,
        thisMonthRevenue: thisMonthRev,
        revenueGrowth: parseFloat(revenueGrowth),
        totalOrders,
        thisMonthOrders,
        totalUsers,
        newUsers,
        totalProducts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Revenue stats (last 12 months)
const getRevenueStats = async (req, res) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const stats = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const formattedStats = stats.map(stat => ({
      month: `${months[stat._id.month - 1]} ${stat._id.year}`,
      revenue: Math.round(stat.revenue * 100) / 100,
      orders: stat.orders,
    }));

    res.status(200).json({ success: true, stats: formattedStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Order trends (last 30 days)
const getOrderTrends = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const trends = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Order status distribution
    const statusDist = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      trends,
      statusDistribution: statusDist,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Top products
const getTopProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const topProducts = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
    ]);

    res.status(200).json({ success: true, products: topProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSalesOverview, getRevenueStats, getOrderTrends, getTopProducts };
