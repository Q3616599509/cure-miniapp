const express = require('express');
const crypto = require('crypto');
const { db, stmts } = require('../database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// WeChat Pay Configuration
// ============================================================
// In production, these come from WeChat Pay merchant platform
// https://pay.weixin.qq.com
const WECHAT_PAY_CONFIG = {
  // Mini Program AppID
  appId: process.env.WECHAT_APPID || 'wxb9f7a9572f976f79',
  // Merchant ID (商户号)
  mchId: process.env.WECHAT_MCH_ID || '',
  // API v3 Key (32 chars)
  apiKey: process.env.WECHAT_API_KEY || '',
  // API v3 Certificate Serial Number
  serialNo: process.env.WECHAT_SERIAL_NO || '',
  // API v3 Private Key Path (PEM)
  privateKeyPath: process.env.WECHAT_PRIVATE_KEY_PATH || '',
  // Notify URL (must be HTTPS)
  notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/v1/payment/notify',
};

// ============================================================
// Generate prepay_id for WeChat Pay JSAPI
// ============================================================
// POST /v1/payment/prepare
router.post('/prepare', auth, async (req, res) => {
  const { orderId } = req.body;

  // Get order
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在' });
  }
  if (order.status !== 'pending_payment') {
    return res.status(400).json({ code: 400, message: '订单状态不正确，无法支付' });
  }
  if (order.pay_amount <= 0) {
    return res.status(400).json({ code: 400, message: '支付金额无效' });
  }

  // Check if WeChat Pay is configured
  if (!WECHAT_PAY_CONFIG.mchId) {
    // Dev mode: return simulated prepay params
    // In real production, this block would be removed
    const mockPrepayId = 'prepay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = Math.random().toString(36).substr(2, 15);
    const pkg = `prepay_id=${mockPrepayId}`;

    // For real WeChat Pay, the sign would be calculated with the merchant key
    const sign = generateMockSign(WECHAT_PAY_CONFIG.appId, timeStamp, nonceStr, pkg);

    // Store the prepay_id for callback verification
    db.prepare('UPDATE orders SET transaction_id = ? WHERE id = ?').run(mockPrepayId, orderId);

    return res.json({
      code: 200,
      data: {
        mode: 'mock',
        timeStamp,
        nonceStr,
        package: pkg,
        signType: 'MD5',
        paySign: sign,
        orderId: order.id,
        orderNo: order.order_no,
      },
      message: '⚠️ 开发环境模拟支付参数。生产环境需配置微信支付商户信息。',
    });
  }

  // ============================================================
  // Real WeChat Pay API v3 integration
  // ============================================================
  // Reference: https://pay.weixin.qq.com/docs/merchant/apis/mini-program-payment/mini-prepay.html

  try {
    // Step 1: Get user's openid
    const user = stmts.userById.get(req.user.id);
    if (!user || !user.openid) {
      return res.status(400).json({ code: 400, message: '用户未绑定微信' });
    }

    // Step 2: Call WeChat Pay unified order API
    const prepayResult = await callWechatPayUnifiedOrder({
      appid: WECHAT_PAY_CONFIG.appId,
      mchid: WECHAT_PAY_CONFIG.mchId,
      description: `Cure订单-${order.order_no}`,
      out_trade_no: order.order_no,
      notify_url: WECHAT_PAY_CONFIG.notifyUrl,
      amount: {
        total: Math.round(order.pay_amount * 100), // Amount in cents
        currency: 'CNY',
      },
      payer: {
        openid: user.openid,
      },
    });

    // Step 3: Generate prepay params for wx.requestPayment
    const prepayId = prepayResult.prepay_id;
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = generateNonceStr();
    const pkg = `prepay_id=${prepayId}`;

    // Step 4: Calculate paySign
    const signStr = `${WECHAT_PAY_CONFIG.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
    const paySign = signWithApiKey(signStr);

    // Store prepay_id
    db.prepare('UPDATE orders SET transaction_id = ? WHERE id = ?').run(prepayId, orderId);

    res.json({
      code: 200,
      data: {
        timeStamp,
        nonceStr,
        package: pkg,
        signType: 'RSA',
        paySign,
        orderId: order.id,
        orderNo: order.order_no,
      },
    });
  } catch (err) {
    console.error('WeChat Pay error:', err);
    res.status(500).json({ code: 500, message: '支付下单失败: ' + (err.message || '未知错误') });
  }
});

// ============================================================
// Payment callback / notify
// ============================================================
// POST /v1/payment/notify
router.post('/notify', async (req, res) => {
  try {
    // Verify signature (simplified — real implementation requires certificate verification)
    const { resource } = req.body;
    if (!resource) {
      return res.status(400).json({ code: 'FAIL', message: 'Invalid callback' });
    }

    // Decrypt resource data (in real implementation, use AEAD_AES_256_GCM)
    const decrypted = resource.ciphertext
      ? decryptNotifyData(resource.ciphertext, resource.associated_data, resource.nonce)
      : resource;

    const { out_trade_no, transaction_id, trade_state } = decrypted;

    if (trade_state !== 'SUCCESS') {
      return res.status(200).json({ code: 'SUCCESS', message: 'Payment not successful' });
    }

    // Update order status
    const order = db.prepare(`
      UPDATE orders SET status = 'paid', paid_at = ?, transaction_id = ?
      WHERE order_no = ? AND status = 'pending_payment'
    `).run(new Date().toISOString(), transaction_id, out_trade_no);

    if (order.changes > 0) {
      // Get the updated order
      const updatedOrder = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(out_trade_no);

      // Award points based on member level
      const orderUser = stmts.userById.get(updatedOrder.user_id);
      const pointsMultiplier = orderUser.level >= 3 ? 2 : (orderUser.level >= 2 ? 1.5 : (orderUser.level >= 1 ? 1.2 : 1));

      const pointsEarned = Math.floor(updatedOrder.pay_amount * pointsMultiplier);
      stmts.addGrowth.run(Math.floor(pointsEarned / 2), pointsEarned, updatedOrder.user_id);
      stmts.addPointsLog.run(updatedOrder.user_id, pointsEarned, 'earn', `订单${updatedOrder.order_no}支付奖励`, updatedOrder.id);

      // Update member level
      const updatedUser = stmts.userById.get(updatedOrder.user_id);
      const newLevel = calculateMemberLevel(updatedUser.growth + pointsEarned / 2);
      if (newLevel > updatedUser.level) {
        stmts.updateLevel.run(newLevel, updatedOrder.user_id);
      }
    }

    // Always respond SUCCESS to WeChat
    res.status(200).json({ code: 'SUCCESS', message: 'OK' });
  } catch (err) {
    console.error('Payment callback error:', err);
    // Still respond SUCCESS to avoid WeChat retrying
    res.status(200).json({ code: 'SUCCESS', message: 'Processed with errors' });
  }
});

// ============================================================
// Payment status query
// ============================================================
// GET /v1/payment/status/:orderNo
router.get('/status/:orderNo', auth, (req, res) => {
  const order = db.prepare(
    'SELECT id, order_no, status, pay_amount, paid_at, transaction_id FROM orders WHERE order_no = ? AND user_id = ?'
  ).get(req.params.orderNo, req.user.id);

  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在' });
  }

  res.json({ code: 200, data: order });
});

// ============================================================
// Helper functions
// ============================================================

function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateMockSign(appId, timeStamp, nonceStr, pkg) {
  // For dev mode, generate a predictable-looking sign
  const raw = `appId=${appId}&nonceStr=${nonceStr}&package=${pkg}&signType=MD5&timeStamp=${timeStamp}&key=dev_mode`;
  return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
}

function signWithApiKey(signStr) {
  // In real implementation, use RSA-SHA256 with merchant private key
  // For API v3, the sign algorithm is RSA-SHA256
  if (!WECHAT_PAY_CONFIG.apiKey) {
    return crypto.createHash('md5').update(signStr + '&key=dev').digest('hex').toUpperCase();
  }
  // In production: return rsaSign(signStr, privateKey)
  return crypto.createHash('md5').update(signStr + `&key=${WECHAT_PAY_CONFIG.apiKey}`).digest('hex').toUpperCase();
}

async function callWechatPayUnifiedOrder(params) {
  // Real implementation: call WeChat Pay API v3
  // POST https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi
  // Requires: merchant certificate, API v3 key, signature
  // This is a placeholder — in production you'd use axios with certificate auth
  throw new Error('微信支付商户未配置。请在环境变量中设置 WECHAT_MCH_ID, WECHAT_API_KEY 等参数');
}

function decryptNotifyData(ciphertext, associatedData, nonce) {
  // AEAD_AES_256_GCM decryption of callback data
  // Requires API v3 key
  throw new Error('Callback decryption not implemented');
}

function calculateMemberLevel(growth) {
  if (growth >= 5000) return 3;  // Diamond
  if (growth >= 2000) return 2;  // Gold
  if (growth >= 500) return 1;   // Silver
  return 0;                       // Regular
}

module.exports = router;
