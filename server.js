require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const { generalLimiter } = require('./src/middleware/rateLimiter');

// Route imports
const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const categoryRoutes = require('./src/routes/categories');
const brandRoutes = require('./src/routes/brands');
const orderRoutes = require('./src/routes/orders');
const cartRoutes = require('./src/routes/cart');
const wishlistRoutes = require('./src/routes/wishlist');
const couponRoutes = require('./src/routes/coupons');
const reviewRoutes = require('./src/routes/reviews');
const addressRoutes = require('./src/routes/addresses');
const bannerRoutes = require('./src/routes/banners');
const paymentRoutes = require('./src/routes/payments');
const shippingRoutes = require('./src/routes/shipping');
const analyticsRoutes = require('./src/routes/analytics');

const app = express();

// Connect to database
connectDB();

// CORS configuration
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,https://zynos-main-site-testing.vercel.app')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow exact matches from env
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any Vercel preview/production deployment
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
// Raw body for Razorpay webhooks
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ZYNOS Backend running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;
