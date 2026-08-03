const express = require('express');
const { db, stmts } = require('../database');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Generate order number
function genOrderNo() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CURE${ts}${rand}`;
}

// Calculate member discount based on level
function getMemberDiscount(level) {
  const discounts = { 0: 1, 1: 0.98, 2: 0.95, 3: 0.9 };
  return discounts[level] || 1;
}

// Calculate points multiplier
function getPointsMultiplier(level) {
  const multipliers = { 0: 1, 1: 1.2, 2: 1.5, 3: 2 };
  return multipliers[level] || 1;
}

// POST /orders — create order
router.post('/', auth, (req, res) => {
  const {
    type = 'mall',
    fulfillment = 'express',
    address_id,
    store_id,
    items,
    coupon_id,
    remark,
  } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ code: 400, message: '请选择商品' });
  }

  // Validate items and calculate totals
  let totalAmount = 0;
  const orderItems = [];

  for (const item of items) {
    const product = stmts.productById.get(item.product_id);
    if (!product) {
      return res.status(400).json({ code: 400, message: `商品 ${item.product_id} 不存在` });
    }

    const price = product.sale_price || product.price;
    const quantity = Math.min(item.quantity || 1, product.stock);
    const subtotal = price * quantity;

    let specText = '';
    let skuId = null;
    let finalPrice = price;

    if (item.sku_id) {
      const skus = stmts.skusByProductId.all(product.id);
      const sku = skus.find(s => s.id === item.sku_id);
      if (sku) {
        specText = JSON.parse(sku.spec_values || '[]').map(sv => `${sv.name}:${sv.value}`).join('，');
        finalPrice = sku.price || price;
        skuId = sku.id;
      }
    }

    totalAmount += finalPrice * quantity;

    orderItems.push({
      product_id: product.id,
      sku_id: skuId,
      product_name: product.name,
      spec_text: specText,
      image: JSON.parse(product.images || '[]')[0] || '',
      price: finalPrice,
      quantity,
      subtotal: finalPrice * quantity,
    });
  }

  // Apply member discount
  const memberDiscount = getMemberDiscount(req.user.level);
  let discountAmount = Math.round(totalAmount * (1 - memberDiscount) * 100) / 100;

  // Apply coupon
  let appliedCoupon = null;
  if (coupon_id) {
    const userCoupon = db.prepare('SELECT uc.*, c.* FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.id = ? AND uc.user_id = ? AND uc.status = ?').get(coupon_id, req.user.id, 'unused');
    if (userCoupon) {
      appliedCoupon = userCoupon;
      if (totalAmount >= userCoupon.threshold) {
        if (userCoupon.type === 'full_reduction') {
          discountAmount += userCoupon.value;
        } else if (userCoupon.type === 'discount') {
          discountAmount += Math.round(totalAmount * (1 - userCoupon.value / 10) * 100) / 100;
        }
        discountAmount = Math.min(discountAmount, totalAmount); // don't go negative
      }
    }
  }

  // Delivery fee (free for orders over 99, or diamond members)
  let deliveryFee = 0;
  if (fulfillment === 'express' && (totalAmount - discountAmount) < 99 && req.user.level < 3) {
    deliveryFee = 8;
  } else if (fulfillment === 'delivery' && (totalAmount - discountAmount) < 29) {
    deliveryFee = 5;
  }

  const payAmount = Math.max(0, Math.round((totalAmount - discountAmount + deliveryFee) * 100) / 100);
  const orderNo = genOrderNo();

  // Create order in transaction
  const createOrder = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO orders (order_no, user_id, type, fulfillment, store_id, address_id,
        total_amount, discount_amount, delivery_fee, pay_amount, status, coupon_id, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)
    `).run(orderNo, req.user.id, type, fulfillment, store_id || null, address_id || null,
      Math.round(totalAmount * 100) / 100, discountAmount, deliveryFee, payAmount, appliedCoupon ? coupon_id : null, remark || '');

    const orderId = result.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, sku_id, product_name, spec_text, image, price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const oi of orderItems) {
      insertItem.run(orderId, oi.product_id, oi.sku_id, oi.product_name, oi.spec_text, oi.image, oi.price, oi.quantity, oi.subtotal);
      // Decrease stock
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?), sales = sales + ? WHERE id = ?').run(oi.quantity, oi.quantity, oi.product_id);
    }

    // Mark coupon as used
    if (appliedCoupon) {
      db.prepare('UPDATE user_coupons SET status = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?').run('used', coupon_id);
    }

    return orderId;
  });

  try {
    const orderId = createOrder();
    const order = stmts.orderById.get(orderId, req.user.id);

    res.json({
      code: 200,
      data: {
        ...order,
        order_no: orderNo,
        pay_amount: payAmount,
      },
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: '创建订单失败: ' + err.message });
  }
});

// POST /orders/:id/pay — simulate payment
router.post('/:id/pay', auth, (req, res) => {
  const order = stmts.orderById.get(req.params.id, req.user.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在' });
  }
  if (order.status !== 'pending_payment') {
    return res.status(400).json({ code: 400, message: '订单状态不正确' });
  }

  // Simulate WeChat Pay success
  const pointsMultiplier = getPointsMultiplier(req.user.level);
  const pointsEarned = Math.floor(order.pay_amount * pointsMultiplier);

  db.transaction(() => {
    db.prepare('UPDATE orders SET status = ?, paid_at = CURRENT_TIMESTAMP, points_earned = ? WHERE id = ?').run('paid', pointsEarned, order.id);
    stmts.addGrowth.run(req.user.id, pointsEarned, pointsEarned);
    stmts.addPointsLog.run(req.user.id, pointsEarned, 'earn', `订单${order.order_no}获得积分`, order.id);

    // Check level upgrade
    const user = stmts.userById.get(req.user.id);
    if (user.growth >= 5000 && user.level < 3) stmts.updateLevel.run(3, user.id);
    else if (user.growth >= 2000 && user.level < 2) stmts.updateLevel.run(2, user.id);
    else if (user.growth >= 500 && user.level < 1) stmts.updateLevel.run(1, user.id);
  })();

  // Clear cart after payment for mall orders
  if (order.type === 'mall') {
    stmts.clearCart.run(req.user.id);
  }

  // Update order status for instant orders
  if (order.type === 'instant') {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('preparing', order.id);
    setTimeout(() => {
      try {
        db.prepare('UPDATE orders SET status = ? WHERE id = ? AND status = ?').run('ready', order.id, 'preparing');
      } catch (_) {}
    }, 5000);
  }

  const updated = stmts.orderById.get(order.id, req.user.id);
  res.json({ code: 200, data: updated });
});

// GET /orders — order list
router.get('/', auth, (req, res) => {
  const { page = 1, page_size = 10, status, type } = req.query;

  const conditions = ['o.user_id = ?'];
  const params = [req.user.id];

  if (status) {
    const statuses = status.split(',');
    conditions.push(`o.status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  }
  if (type) { conditions.push('o.type = ?'); params.push(type); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(page_size);

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM orders o ${where}`).get(...params);
  const rows = db.prepare(`SELECT o.* FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(page_size), offset);

  // Attach items to each order
  const orders = rows.map(o => ({
    ...o,
    items: stmts.orderItems.all(o.id),
  }));

  res.json({
    code: 200,
    data: {
      list: orders,
      total: countRow.total,
      page: parseInt(page),
      page_size: parseInt(page_size),
    },
  });
});

// GET /orders/:id — order detail
router.get('/:id', auth, (req, res) => {
  const order = stmts.orderById.get(req.params.id, req.user.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在' });
  }
  const items = stmts.orderItems.all(order.id);
  res.json({ code: 200, data: { ...order, items } });
});

// PUT /orders/:id/cancel — cancel order
router.put('/:id/cancel', auth, (req, res) => {
  const order = stmts.orderById.get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });
  if (order.status !== 'pending_payment' && order.status !== 'paid') {
    return res.status(400).json({ code: 400, message: '当前状态不可取消' });
  }

  db.transaction(() => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', order.id);
    // Restore stock
    const items = stmts.orderItems.all(order.id);
    for (const item of items) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
    }
    // Return coupon if used
    if (order.coupon_id) {
      db.prepare('UPDATE user_coupons SET status = ? WHERE id = ? AND user_id = ?').run('unused', order.coupon_id, req.user.id);
    }
  })();

  res.json({ code: 200, data: { status: 'cancelled' } });
});

// PUT /orders/:id/confirm — confirm receipt
router.put('/:id/confirm', auth, (req, res) => {
  const order = stmts.orderById.get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });
  if (order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'ready') {
    return res.status(400).json({ code: 400, message: '当前状态不可确认收货' });
  }

  db.prepare('UPDATE orders SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', order.id);
  res.json({ code: 200, data: { status: 'completed' } });
});

module.exports = router;
