const express = require('express');
const path = require('path');
const multer = require('multer');
const { db, stmts } = require('../../database');
const { adminAuth, requireRole, adminLogin } = require('../../middleware/adminAuth');
const { generateToken } = require('../../middleware/auth');

const router = express.Router();

// ============================================================
// Image Upload
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `product_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|jpg|png|webp|gif)/.test(file.mimetype);
    cb(ok ? null : new Error('只支持图片格式'), ok);
  },
});

// POST /admin/upload — upload product image
router.post('/upload', adminAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 400, message: '请选择图片' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ code: 200, data: { url, filename: req.file.filename } });
});

// ============================================================
// Admin Auth
// ============================================================

// POST /admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Dev mode: accept code=openid or username
  const code = username || password || '';
  const user = db.prepare("SELECT * FROM users WHERE (openid = ? OR nickname = ?) AND role != 'user'").get(code, code);

  if (!user) {
    return res.status(401).json({ code: 401, message: '账号不存在或没有管理员权限' });
  }

  if (user.status === 0) {
    return res.status(403).json({ code: 403, message: '账号已被禁用，请联系超级管理员' });
  }

  const token = generateToken(user.id);
  res.json({
    code: 200,
    data: {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        role: user.role,
        phone: user.phone,
      },
    },
  });
});

// GET /admin/profile
router.get('/profile', adminAuth, (req, res) => {
  res.json({
    code: 200,
    data: {
      id: req.user.id,
      nickname: req.user.nickname,
      avatar_url: req.user.avatar_url,
      role: req.user.role,
      phone: req.user.phone,
    },
  });
});

// ============================================================
// Dashboard
// ============================================================

// GET /admin/dashboard
router.get('/dashboard', adminAuth, (req, res) => {
  const stats = stmts.dashboardStats.get();

  // Recent orders (last 7 days)
  const recentOrders = db.prepare(`
    SELECT COUNT(*) as count, date(created_at) as date
    FROM orders
    WHERE created_at >= date('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all();

  // Order status distribution
  const statusDist = db.prepare(`
    SELECT status, COUNT(*) as count FROM orders GROUP BY status
  `).all();

  // Top stores by orders
  const topStores = db.prepare(`
    SELECT s.name, COUNT(o.id) as order_count, COALESCE(SUM(o.pay_amount), 0) as revenue
    FROM orders o
    LEFT JOIN stores s ON o.store_id = s.id
    WHERE o.store_id IS NOT NULL AND o.status != 'cancelled'
    GROUP BY o.store_id
    ORDER BY order_count DESC
    LIMIT 5
  `).all();

  res.json({
    code: 200,
    data: {
      ...stats,
      recentOrders,
      statusDist,
      topStores,
    },
  });
});

// ============================================================
// Store Management
// ============================================================

// GET /admin/stores
router.get('/stores', adminAuth, (req, res) => {
  const stores = stmts.allStores.all();

  // Get order count per store
  const storeOrders = db.prepare(`
    SELECT store_id, COUNT(*) as order_count
    FROM orders WHERE store_id IS NOT NULL
    GROUP BY store_id
  `).all();
  const orderMap = {};
  storeOrders.forEach(s => { orderMap[s.store_id] = s.order_count; });

  const result = stores.map(s => ({
    ...s,
    tags: JSON.parse(s.tags || '[]'),
    order_count: orderMap[s.id] || 0,
  }));

  res.json({ code: 200, data: result });
});

// GET /admin/stores/:id
router.get('/stores/:id', adminAuth, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ code: 404, message: '门店不存在' });
  store.tags = JSON.parse(store.tags || '[]');
  res.json({ code: 200, data: store });
});

// POST /admin/stores
router.post('/stores', adminAuth, requireRole('store_manager'), (req, res) => {
  const { name, address, city, district, latitude, longitude, phone, hours, image, description, is_24h, tags, status } = req.body;

  if (!name || !address) {
    return res.status(400).json({ code: 400, message: '门店名称和地址不能为空' });
  }

  const result = stmts.createStore.run(
    name, address || '', city || '', district || '',
    latitude || 0, longitude || 0, phone || '',
    hours || '09:00-22:00', image || '',
    description || '', is_24h ? 1 : 0,
    JSON.stringify(tags || []), status !== undefined ? status : 1
  );

  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(result.lastInsertRowid);
  store.tags = JSON.parse(store.tags || '[]');
  res.status(201).json({ code: 201, data: store, message: '门店创建成功' });
});

// PUT /admin/stores/:id
router.put('/stores/:id', adminAuth, requireRole('store_manager'), (req, res) => {
  const existing = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ code: 404, message: '门店不存在' });

  const { name, address, city, district, latitude, longitude, phone, hours, image, description, is_24h, tags, status } = req.body;

  stmts.updateStore.run(
    name || existing.name,
    address || existing.address,
    city || existing.city || '',
    district || existing.district || '',
    latitude !== undefined ? latitude : existing.latitude,
    longitude !== undefined ? longitude : existing.longitude,
    phone || existing.phone || '',
    hours || existing.hours || '09:00-22:00',
    image || existing.image || '',
    description || existing.description || '',
    is_24h !== undefined ? (is_24h ? 1 : 0) : existing.is_24h,
    JSON.stringify(tags || JSON.parse(existing.tags || '[]')),
    status !== undefined ? status : existing.status,
    req.params.id
  );

  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  store.tags = JSON.parse(store.tags || '[]');
  res.json({ code: 200, data: store, message: '门店更新成功' });
});

// DELETE /admin/stores/:id
router.delete('/stores/:id', adminAuth, requireRole('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ code: 404, message: '门店不存在' });

  // Check if store has orders
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders WHERE store_id = ?').get(req.params.id);
  if (orderCount.count > 0) {
    return res.status(400).json({ code: 400, message: `该门店有${orderCount.count}笔关联订单，无法删除。建议改为停用` });
  }

  stmts.deleteStore.run(req.params.id);
  res.json({ code: 200, message: '门店删除成功' });
});

// ============================================================
// Order Management
// ============================================================

// GET /admin/orders
router.get('/orders', adminAuth, (req, res) => {
  const { status, page = 1, pageSize = 20, keyword } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let sql = `
    SELECT o.*, u.nickname, u.avatar_url, s.name as store_name
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN stores s ON o.store_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (o.order_no LIKE ? OR u.nickname LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);

  const orders = db.prepare(sql).all(...params);

  // Count total
  let countSql = 'SELECT COUNT(*) as total FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1';
  const countParams = [];
  if (status) { countSql += ' AND o.status = ?'; countParams.push(status); }
  if (keyword) { countSql += ' AND (o.order_no LIKE ? OR u.nickname LIKE ?)'; countParams.push(`%${keyword}%`, `%${keyword}%`); }
  const { total } = db.prepare(countSql).get(...countParams);

  res.json({
    code: 200,
    data: {
      list: orders,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize)),
    },
  });
});

// GET /admin/orders/:id
router.get('/orders/:id', adminAuth, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.nickname, u.avatar_url, u.phone as user_phone, s.name as store_name, s.address as store_address
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN stores s ON o.store_id = s.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);

  res.json({ code: 200, data: { ...order, items } });
});

// PUT /admin/orders/:id/status
router.put('/orders/:id/status', adminAuth, requireRole('operator'), (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending_payment', 'paid', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ code: 400, message: `无效状态。可选: ${validStatuses.join(', ')}` });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });

  const updates = { status };
  if (status === 'paid' && !order.paid_at) updates.paid_at = new Date().toISOString();
  if (status === 'completed') updates.completed_at = new Date().toISOString();

  db.prepare(`UPDATE orders SET status = ?${status === 'paid' && !order.paid_at ? ', paid_at = ?' : ''}${status === 'completed' ? ', completed_at = ?' : ''} WHERE id = ?`)
    .run(status, ...(status === 'paid' ? [updates.paid_at] : []), ...(status === 'completed' ? [updates.completed_at] : []), req.params.id);

  res.json({ code: 200, message: `订单状态已更新为: ${status}` });
});

// ============================================================
// Product Management
// ============================================================

// GET /admin/products
router.get('/products', adminAuth, (req, res) => {
  const products = stmts.allProducts.all();
  // Parse images/tags JSON strings for admin UI
  const parsed = products.map(p => ({
    ...p,
    images: JSON.parse(p.images || '[]'),
    tags: JSON.parse(p.tags || '[]'),
  }));
  res.json({ code: 200, data: parsed });
});

// GET /admin/products/:id — single product (with parsed images/tags)
router.get('/products/:id', adminAuth, (req, res) => {
  const product = stmts.productById.get(req.params.id);
  if (!product) return res.status(404).json({ code: 404, message: '商品不存在' });
  product.images = JSON.parse(product.images || '[]');
  product.tags = JSON.parse(product.tags || '[]');
  res.json({ code: 200, data: product });
});

// PUT /admin/products/:id/status
router.put('/products/:id/status', adminAuth, requireRole('operator'), (req, res) => {
  const { status } = req.body;
  if (![0, 1].includes(status)) {
    return res.status(400).json({ code: 400, message: '状态值无效' });
  }
  const result = stmts.updateProductStatus.run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ code: 404, message: '商品不存在' });
  res.json({ code: 200, message: status === 1 ? '商品已上架' : '商品已下架' });
});

// ============================================================
// User Management
// ============================================================

// GET /admin/users
router.get('/users', adminAuth, requireRole('admin'), (req, res) => {
  const { page = 1, pageSize = 20, keyword, role } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let sql = 'SELECT id, openid, nickname, avatar_url, phone, balance, points, growth, level, role, status, created_at FROM users WHERE 1=1';
  const params = [];

  if (keyword) {
    sql += ' AND (nickname LIKE ? OR phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }

  // Count total
  let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
  const countParams = [];
  if (keyword) { countSql += ' AND (nickname LIKE ? OR phone LIKE ?)'; countParams.push(`%${keyword}%`, `%${keyword}%`); }
  if (role) { countSql += ' AND role = ?'; countParams.push(role); }
  const { total } = db.prepare(countSql).get(...countParams);

  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);

  const users = db.prepare(sql).all(...params);

  res.json({
    code: 200,
    data: {
      list: users,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize)),
    },
  });
});

// PUT /admin/users/:id/role
router.put('/users/:id/role', adminAuth, requireRole('super_admin'), (req, res) => {
  const { role } = req.body;
  const validRoles = ['user', 'operator', 'store_manager', 'admin', 'super_admin'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ code: 400, message: `无效角色。可选: ${validRoles.join(', ')}` });
  }

  // Only super_admin can assign super_admin
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ code: 403, message: '只有超级管理员才能设置超级管理员角色' });
  }

  const result = stmts.updateUserRole.run(role, req.params.id);
  if (result.changes === 0) return res.status(404).json({ code: 404, message: '用户不存在' });
  res.json({ code: 200, message: '角色更新成功' });
});

// PUT /admin/users/:id/status
router.put('/users/:id/status', adminAuth, requireRole('admin'), (req, res) => {
  const { status } = req.body;
  if (![0, 1].includes(status)) {
    return res.status(400).json({ code: 400, message: '状态值无效' });
  }
  // Cannot disable yourself
  if (parseInt(req.params.id) === req.user.id && status === 0) {
    return res.status(400).json({ code: 400, message: '不能禁用自己' });
  }
  const result = stmts.updateUserStatus.run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ code: 404, message: '用户不存在' });
  res.json({ code: 200, message: status === 1 ? '用户已启用' : '用户已禁用' });
});

module.exports = router;
