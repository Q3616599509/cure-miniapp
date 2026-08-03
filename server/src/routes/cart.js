const express = require('express');
const { stmts } = require('../database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /cart
router.get('/', auth, (req, res) => {
  const items = stmts.cartByUser.all(req.user.id);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  res.json({
    code: 200,
    data: {
      items: items.map(i => ({
        ...i,
        product_images: JSON.parse(i.product_images || '[]'),
      })),
      totalCount,
    },
  });
});

// POST /cart — add to cart
router.post('/', auth, (req, res) => {
  const { product_id, sku_id, quantity = 1 } = req.body;

  const existing = stmts.cartItem.get(req.user.id, product_id, sku_id || null, sku_id || null);
  if (existing) {
    stmts.updateCartQty.run(existing.quantity + quantity, existing.id, req.user.id);
  } else {
    stmts.addCart.run(req.user.id, product_id, sku_id || null, quantity);
  }

  const count = stmts.cartCount.get(req.user.id);
  res.json({ code: 200, data: { count: count?.count || 0 }, message: '已加入购物车' });
});

// PUT /cart/:id — update quantity
router.put('/:id', auth, (req, res) => {
  const { quantity } = req.body;
  const result = stmts.updateCartQty.run(quantity, req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ code: 404, message: '购物车项不存在' });
  }
  const count = stmts.cartCount.get(req.user.id);
  res.json({ code: 200, data: { count: count?.count || 0 } });
});

// DELETE /cart/:id
router.delete('/:id', auth, (req, res) => {
  stmts.deleteCart.run(req.params.id, req.user.id);
  const count = stmts.cartCount.get(req.user.id);
  res.json({ code: 200, data: { count: count?.count || 0 } });
});

// DELETE /cart — clear cart
router.delete('/', auth, (req, res) => {
  stmts.clearCart.run(req.user.id);
  res.json({ code: 200, data: { count: 0 }, message: '购物车已清空' });
});

module.exports = router;
