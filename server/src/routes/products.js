const express = require('express');
const { db, stmts } = require('../database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /products — product list with pagination, filtering, sorting
router.get('/', optionalAuth, (req, res) => {
  const {
    page = 1,
    page_size = 20,
    category_id,
    keyword,
    sort = 'default',
    is_hot,
    is_new,
    min_price,
    max_price,
    fulfillment,
  } = req.query;

  const conditions = ['p.status = 1'];
  const params = [];

  if (category_id) {
    conditions.push('(p.category_id = ? OR c.parent_id = ?)');
    params.push(category_id, category_id);
  }
  if (keyword) {
    conditions.push('p.name LIKE ?');
    params.push(`%${keyword}%`);
  }
  if (is_hot) { conditions.push('p.is_hot = 1'); }
  if (is_new) { conditions.push('p.is_new = 1'); }
  if (min_price) { conditions.push('p.sale_price >= ?'); params.push(min_price); }
  if (max_price) { conditions.push('p.sale_price <= ?'); params.push(max_price); }
  if (fulfillment) { conditions.push('p.fulfillment LIKE ?'); params.push(`%${fulfillment}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderBy = 'ORDER BY p.is_hot DESC, p.sales DESC, p.id DESC';
  switch (sort) {
    case 'sales': orderBy = 'ORDER BY p.sales DESC'; break;
    case 'price_asc': orderBy = 'ORDER BY p.sale_price ASC'; break;
    case 'price_desc': orderBy = 'ORDER BY p.sale_price DESC'; break;
    case 'newest': orderBy = 'ORDER BY p.created_at DESC'; break;
  }

  const offset = (parseInt(page) - 1) * parseInt(page_size);
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where}`).get(...params);
  const rows = db.prepare(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where} ${orderBy} LIMIT ? OFFSET ?`).all(...params, parseInt(page_size), offset);

  // Check favorites if user logged in
  if (req.user) {
    const favIds = new Set(stmts.favoritesByUser.all(req.user.id).map(f => f.product_id));
    rows.forEach(r => { r.is_favorited = favIds.has(r.id); });
  }

  res.json({
    code: 200,
    data: {
      list: rows.map(p => ({
        ...p,
        images: JSON.parse(p.images || '[]'),
        tags: JSON.parse(p.tags || '[]'),
        specs: JSON.parse(p.specs || '[]'),
      })),
      total: countRow.total,
      page: parseInt(page),
      page_size: parseInt(page_size),
    },
  });
});

// GET /products/hot — hot recommendations
router.get('/hot', (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE status = 1 AND is_hot = 1 ORDER BY sales DESC LIMIT 10').all();
  res.json({
    code: 200,
    data: rows.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      tags: JSON.parse(p.tags || '[]'),
      specs: JSON.parse(p.specs || '[]'),
    })),
  });
});

// GET /products/:id — product detail
router.get('/:id', optionalAuth, (req, res) => {
  const product = stmts.productById.get(req.params.id);
  if (!product) {
    return res.status(404).json({ code: 404, message: '商品不存在' });
  }

  const skus = stmts.skusByProductId.all(product.id);
  let isFavorited = false;
  if (req.user) {
    isFavorited = !!stmts.isFavorite.get(req.user.id, product.id);
  }

  res.json({
    code: 200,
    data: {
      ...product,
      images: JSON.parse(product.images || '[]'),
      tags: JSON.parse(product.tags || '[]'),
      specs: JSON.parse(product.specs || '[]'),
      skus: skus.map(s => ({ ...s, spec_values: JSON.parse(s.spec_values || '[]') })),
      is_favorited: isFavorited,
    },
  });
});

// GET /categories — category tree
router.get('/categories/tree', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort ASC').all();
  const parents = categories.filter(c => !c.parent_id);
  const tree = parents.map(p => ({
    ...p,
    children: categories.filter(c => c.parent_id === p.id),
  }));
  res.json({ code: 200, data: tree });
});

// PUT /products/:id — update product (admin only, images etc.)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { images, name, price, sale_price, stock, description, status } = req.body;

  const product = stmts.productById.get(id);
  if (!product) {
    return res.status(404).json({ code: 404, message: '商品不存在' });
  }

  const updates = [];
  const params = [];

  if (images !== undefined) {
    updates.push('images = ?');
    params.push(typeof images === 'string' ? images : JSON.stringify(images));
  }
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (price !== undefined) { updates.push('price = ?'); params.push(price); }
  if (sale_price !== undefined) { updates.push('sale_price = ?'); params.push(sale_price); }
  if (stock !== undefined) { updates.push('stock = ?'); params.push(stock); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }

  if (updates.length === 0) {
    return res.json({ code: 200, message: '无更新' });
  }

  params.push(id);
  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ code: 200, message: '商品更新成功' });
});

module.exports = router;
