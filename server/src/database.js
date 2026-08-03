const Database = require('better-sqlite3');
const path = require('path');
const config = require('./config');

const dbPath = path.resolve(__dirname, '..', config.dbPath);
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openid VARCHAR(64) UNIQUE NOT NULL,
    nickname VARCHAR(64) DEFAULT '',
    avatar_url VARCHAR(512) DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    balance DECIMAL(10,2) DEFAULT 0,
    points INTEGER DEFAULT 0,
    growth INTEGER DEFAULT 0,
    level TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(32) NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    icon VARCHAR(256) DEFAULT '',
    sort INTEGER DEFAULT 0,
    type VARCHAR(16) DEFAULT 'mall'
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT DEFAULT '',
    images TEXT DEFAULT '[]',
    price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2) DEFAULT NULL,
    member_price DECIMAL(10,2) DEFAULT NULL,
    stock INTEGER DEFAULT 0,
    sales INTEGER DEFAULT 0,
    specs TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    is_hot INTEGER DEFAULT 0,
    is_new INTEGER DEFAULT 0,
    sort INTEGER DEFAULT 100,
    fulfillment VARCHAR(32) DEFAULT 'express',
    status TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    spec_values TEXT DEFAULT '[]',
    price DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    sku_code VARCHAR(64) DEFAULT '',
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    sku_id INTEGER,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(32) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    province VARCHAR(32) DEFAULT '',
    city VARCHAR(32) DEFAULT '',
    district VARCHAR(32) DEFAULT '',
    detail VARCHAR(256) DEFAULT '',
    is_default INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no VARCHAR(32) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    type VARCHAR(16) DEFAULT 'mall',
    fulfillment VARCHAR(16) DEFAULT 'express',
    store_id INTEGER DEFAULT NULL,
    address_id INTEGER DEFAULT NULL,
    total_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    pay_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(16) DEFAULT 'pending_payment',
    coupon_id INTEGER DEFAULT NULL,
    points_earned INTEGER DEFAULT 0,
    pickup_code VARCHAR(8) DEFAULT '',
    remark VARCHAR(256) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    sku_id INTEGER,
    product_name VARCHAR(128) NOT NULL,
    spec_text VARCHAR(256) DEFAULT '',
    image VARCHAR(512) DEFAULT '',
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    subtotal DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(64) NOT NULL,
    type VARCHAR(16) DEFAULT 'full_reduction',
    threshold DECIMAL(10,2) DEFAULT 0,
    value DECIMAL(10,2) NOT NULL,
    total_count INTEGER DEFAULT 100,
    valid_days INTEGER DEFAULT 30,
    description VARCHAR(256) DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS user_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    coupon_id INTEGER NOT NULL,
    status VARCHAR(16) DEFAULT 'unused',
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME,
    expire_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS points_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type VARCHAR(32) DEFAULT 'earn',
    description VARCHAR(128) DEFAULT '',
    order_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    rating TINYINT DEFAULT 5,
    content TEXT DEFAULT '',
    images TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(64) NOT NULL,
    address VARCHAR(256) DEFAULT '',
    latitude REAL DEFAULT 0,
    longitude REAL DEFAULT 0,
    phone VARCHAR(20) DEFAULT '',
    hours VARCHAR(64) DEFAULT '09:00-22:00',
    status TINYINT DEFAULT 1
  );
`);

// Migrations for existing databases
try { db.exec('ALTER TABLE products ADD COLUMN sort INTEGER DEFAULT 100'); } catch (_) {}
try { db.exec('ALTER TABLE users ADD COLUMN role VARCHAR(16) DEFAULT "user"'); } catch (_) {}
try { db.exec('ALTER TABLE users ADD COLUMN status TINYINT DEFAULT 1'); } catch (_) {}
try { db.exec('ALTER TABLE stores ADD COLUMN image VARCHAR(512) DEFAULT ""'); } catch (_) {}
try { db.exec('ALTER TABLE stores ADD COLUMN city VARCHAR(32) DEFAULT ""'); } catch (_) {}
try { db.exec('ALTER TABLE stores ADD COLUMN district VARCHAR(32) DEFAULT ""'); } catch (_) {}
try { db.exec('ALTER TABLE stores ADD COLUMN description VARCHAR(512) DEFAULT ""'); } catch (_) {}
try { db.exec('ALTER TABLE stores ADD COLUMN is_24h INTEGER DEFAULT 0'); } catch (_) {}
try { db.exec('ALTER TABLE stores ADD COLUMN tags TEXT DEFAULT "[]"'); } catch (_) {}
try { db.exec('ALTER TABLE orders ADD COLUMN payment_method VARCHAR(16) DEFAULT "wechat"'); } catch (_) {}
try { db.exec('ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(64) DEFAULT ""'); } catch (_) {}

// ── Prepared Statements ─────────────────────────────────────────

const stmts = {
  // Users
  userByOpenid: db.prepare('SELECT * FROM users WHERE openid = ?'),
  userById: db.prepare('SELECT id, nickname, avatar_url, phone, balance, points, growth, level, role, status, created_at FROM users WHERE id = ?'),
  createUser: db.prepare('INSERT INTO users (openid, nickname, avatar_url) VALUES (?, ?, ?)'),
  updateUser: db.prepare('UPDATE users SET nickname = ?, avatar_url = ? WHERE id = ?'),
  updatePhone: db.prepare('UPDATE users SET phone = ? WHERE id = ?'),
  addGrowth: db.prepare('UPDATE users SET growth = growth + ?, points = points + ? WHERE id = ?'),
  updateLevel: db.prepare('UPDATE users SET level = ? WHERE id = ?'),

  // Products
  productById: db.prepare('SELECT * FROM products WHERE id = ? AND status = 1'),
  skusByProductId: db.prepare('SELECT * FROM skus WHERE product_id = ?'),

  // Cart
  cartByUser: db.prepare(`
    SELECT ci.*, p.name as product_name, p.images as product_images, p.sale_price, p.member_price, p.stock, p.fulfillment
    FROM cart_items ci JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ? ORDER BY ci.created_at DESC
  `),
  cartItem: db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND (sku_id = ? OR (sku_id IS NULL AND ? IS NULL))'),
  addCart: db.prepare('INSERT INTO cart_items (user_id, product_id, sku_id, quantity) VALUES (?, ?, ?, ?)'),
  updateCartQty: db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?'),
  deleteCart: db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?'),
  clearCart: db.prepare('DELETE FROM cart_items WHERE user_id = ?'),
  cartCount: db.prepare('SELECT SUM(quantity) as count FROM cart_items WHERE user_id = ?'),

  // Addresses
  addressesByUser: db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC'),
  addressById: db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?'),

  // Orders
  orderByNo: db.prepare('SELECT * FROM orders WHERE order_no = ?'),
  orderById: db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?'),
  orderItems: db.prepare('SELECT * FROM order_items WHERE order_id = ?'),

  // Coupons
  couponById: db.prepare('SELECT * FROM coupons WHERE id = ?'),
  userCoupons: db.prepare('SELECT uc.*, c.name, c.type, c.threshold, c.value, c.description FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = ? ORDER BY uc.status ASC, uc.expire_at ASC'),

  // Favorites
  favoritesByUser: db.prepare(`
    SELECT f.*, p.name as product_name, p.images, p.sale_price, p.stock
    FROM favorites f JOIN products p ON f.product_id = p.id
    WHERE f.user_id = ? ORDER BY f.created_at DESC
  `),
  addFavorite: db.prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)'),
  removeFavorite: db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?'),
  isFavorite: db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?'),

  // Points log
  pointsLog: db.prepare('SELECT * FROM points_log WHERE user_id = ? ORDER BY created_at DESC'),
  addPointsLog: db.prepare('INSERT INTO points_log (user_id, amount, type, description, order_id) VALUES (?, ?, ?, ?, ?)'),

  // Stores
  storeById: db.prepare('SELECT * FROM stores WHERE id = ?'),
  allStores: db.prepare('SELECT * FROM stores ORDER BY id DESC'),
  createStore: db.prepare('INSERT INTO stores (name, address, city, district, latitude, longitude, phone, hours, image, description, is_24h, tags, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  updateStore: db.prepare('UPDATE stores SET name=?, address=?, city=?, district=?, latitude=?, longitude=?, phone=?, hours=?, image=?, description=?, is_24h=?, tags=?, status=? WHERE id=?'),
  deleteStore: db.prepare('DELETE FROM stores WHERE id = ?'),

  // Admin - Users
  allUsers: db.prepare('SELECT id, openid, nickname, avatar_url, phone, balance, points, growth, level, role, status, created_at FROM users ORDER BY id DESC'),
  updateUserRole: db.prepare('UPDATE users SET role = ? WHERE id = ?'),
  updateUserStatus: db.prepare('UPDATE users SET status = ? WHERE id = ?'),

  // Admin - Orders
  allOrders: db.prepare(`
    SELECT o.*, u.nickname, u.avatar_url, s.name as store_name
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN stores s ON o.store_id = s.id
    ORDER BY o.created_at DESC
  `),

  // Admin - Stats
  dashboardStats: db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM orders WHERE status != 'cancelled') as total_orders,
      (SELECT COALESCE(SUM(pay_amount), 0) FROM orders WHERE status IN ('paid','preparing','ready','delivering','completed')) as total_revenue,
      (SELECT COUNT(*) FROM orders WHERE date(created_at) = date('now')) as today_orders,
      (SELECT COALESCE(SUM(pay_amount), 0) FROM orders WHERE date(created_at) = date('now') AND status IN ('paid','preparing','ready','delivering','completed')) as today_revenue,
      (SELECT COUNT(*) FROM products WHERE status = 1) as total_products,
      (SELECT COUNT(*) FROM stores WHERE status = 1) as total_stores
  `),

  // Admin - Products
  allProducts: db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id DESC'),
  updateProductStatus: db.prepare('UPDATE products SET status = ? WHERE id = ?'),
};

module.exports = { db, stmts };
