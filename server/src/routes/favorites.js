const express = require('express');
const { stmts } = require('../database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /favorites
router.get('/', auth, (req, res) => {
  const favorites = stmts.favoritesByUser.all(req.user.id);
  res.json({
    code: 200,
    data: favorites.map(f => ({
      ...f,
      images: JSON.parse(f.images || '[]'),
    })),
  });
});

// POST /favorites
router.post('/', auth, (req, res) => {
  const { product_id } = req.body;
  if (!product_id) {
    return res.status(400).json({ code: 400, message: '商品ID不能为空' });
  }
  stmts.addFavorite.run(req.user.id, product_id);
  res.json({ code: 200, message: '已收藏' });
});

// DELETE /favorites/:productId
router.delete('/:productId', auth, (req, res) => {
  stmts.removeFavorite.run(req.user.id, req.params.productId);
  res.json({ code: 200, message: '已取消收藏' });
});

module.exports = router;
