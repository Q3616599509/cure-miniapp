const express = require('express');
const { db, stmts } = require('../database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /member/info
router.get('/info', auth, (req, res) => {
  const user = stmts.userById.get(req.user.id);

  const levelNames = ['普通会员', '银卡会员', '金卡会员', '钻石会员'];
  const discounts = [1, 0.98, 0.95, 0.9];
  const pointsMultipliers = [1, 1.2, 1.5, 2];
  const freeShippingThresholds = [99, 79, 49, 0];

  // Calculate next level requirements
  const growthThresholds = [0, 500, 2000, 5000, Infinity];
  const nextLevelGrowth = growthThresholds[user.level + 1] || Infinity;
  const growthProgress = nextLevelGrowth === Infinity ? 100
    : Math.min(100, Math.round((user.growth - growthThresholds[user.level]) / (nextLevelGrowth - growthThresholds[user.level]) * 100));

  res.json({
    code: 200,
    data: {
      level: user.level,
      level_name: levelNames[user.level],
      growth: user.growth,
      points: user.points,
      discount: discounts[user.level],
      points_multiplier: pointsMultipliers[user.level],
      free_shipping_threshold: freeShippingThresholds[user.level],
      next_level_growth: nextLevelGrowth,
      growth_progress: growthProgress,
      level_names: levelNames,
      growth_thresholds: growthThresholds,
    },
  });
});

// GET /member/points-log
router.get('/points-log', auth, (req, res) => {
  const { page = 1, page_size = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(page_size);

  const countRow = db.prepare('SELECT COUNT(*) as total FROM points_log WHERE user_id = ?').get(req.user.id);
  const rows = stmts.pointsLog.all(req.user.id).slice(offset, offset + parseInt(page_size));

  res.json({
    code: 200,
    data: {
      list: rows,
      total: countRow.total,
    },
  });
});

// GET /coupons — available coupons to claim
router.get('/coupons/available', (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY threshold ASC').all();
  res.json({ code: 200, data: coupons });
});

// GET /member/coupons — my coupons
router.get('/my-coupons', auth, (req, res) => {
  const coupons = stmts.userCoupons.all(req.user.id);
  res.json({ code: 200, data: coupons });
});

// POST /member/coupons/:id/receive
router.post('/receive-coupon/:id', auth, (req, res) => {
  const coupon = stmts.couponById.get(req.params.id);
  if (!coupon) {
    return res.status(404).json({ code: 404, message: '优惠券不存在' });
  }

  const already = db.prepare('SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ?').get(req.user.id, coupon.id);
  if (already) {
    return res.status(400).json({ code: 400, message: '已领取过该优惠券' });
  }

  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + coupon.valid_days);

  db.prepare('INSERT INTO user_coupons (user_id, coupon_id, expire_at) VALUES (?, ?, ?)').run(
    req.user.id, coupon.id, expireAt.toISOString().split('T')[0]
  );

  res.json({ code: 200, message: '领取成功' });
});

module.exports = router;
