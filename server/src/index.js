const express = require('express');
const cors = require('cors');
const config = require('./config');

// Route imports
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const memberRoutes = require('./routes/member');
const addressRoutes = require('./routes/addresses');
const favoriteRoutes = require('./routes/favorites');
const storeRoutes = require('./routes/stores');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin/index');

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API routes
app.use('/v1/auth', authRoutes);
app.use('/v1/products', productRoutes);
app.use('/v1/orders', orderRoutes);
app.use('/v1/cart', cartRoutes);
app.use('/v1/member', memberRoutes);
app.use('/v1/addresses', addressRoutes);
app.use('/v1/favorites', favoriteRoutes);
app.use('/v1/stores', storeRoutes);
app.use('/v1/payment', paymentRoutes);
app.use('/admin', adminRoutes);

// Serve admin panel static files
const path = require('path');
app.use('/admin/panel', express.static(path.join(__dirname, '..', 'admin-panel')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    code: 500,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Cure API Server running on http://localhost:${config.port}`);
  console.log(`   Health: http://localhost:${config.port}/health`);
  console.log(`   API:    http://localhost:${config.port}/v1/`);
});
