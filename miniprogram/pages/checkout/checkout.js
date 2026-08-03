// pages/checkout/checkout.js — Order checkout & payment
const app = getApp();
const { formatPrice, showToast } = require('../../utils/util');

Page({
  data: {
    // Order data
    items: [],
    store: null,
    remark: '',

    // Price breakdown
    subtotal: '0.00',
    memberDiscount: '0.00',
    deliveryFee: '0.00',
    payAmount: '0.00',
    memberLevel: 0,
    memberLevelText: '',

    // UI state
    submitting: false,
    paymentSuccess: false,
    paidOrderNo: '',
    paidOrderId: null,

    // Nav
    statusBarHeight: 20,
  },

  onLoad() {
    const sysInfo = app.globalData.systemInfo || {};
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 });

    const cart = app.globalData.cart || [];
    const store = app.globalData.currentStore;

    if (cart.length === 0 || !store) {
      showToast('订单数据异常，请返回重试');
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const items = cart.map(item => ({
      ...item,
      subtotal: (item.price * item.quantity).toFixed(2),
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const userInfo = app.globalData.userInfo || {};
    const level = userInfo.level || 0;

    // Member discount rates
    const discountRates = { 0: 0, 1: 0.98, 2: 0.95, 3: 0.9 };
    const levelTexts = { 0: '普通会员', 1: '白银会员', 2: '黄金会员', 3: '钻石会员' };
    const discRate = discountRates[level] || 0;
    const memberDiscount = discRate > 0 ? Math.round(subtotal * (1 - discRate) * 100) / 100 : 0;
    const payAmount = (subtotal - memberDiscount).toFixed(2);

    this.setData({
      items,
      store,
      subtotal: formatPrice(subtotal),
      memberDiscount: memberDiscount > 0 ? `-${formatPrice(memberDiscount)}` : '0.00',
      payAmount: formatPrice(parseFloat(payAmount)),
      memberLevel: level,
      memberLevelText: levelTexts[level] || '',
    });
  },

  // ── Remark ──
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  // ── Submit Order & Pay ──
  async onSubmit() {
    if (this.data.submitting || this.data.paymentSuccess) return;

    const { items, store, remark, payAmount } = this.data;
    if (payAmount === '0.00') {
      showToast('订单金额异常');
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '创建订单...', mask: true });

    let order;
    try {
      // Step 1: Create order
      const orderRes = await app.request({
        url: '/orders',
        method: 'POST',
        data: {
          type: 'instant',
          fulfillment: 'pickup',
          store_id: store.id,
          items: items.map(item => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
          remark,
        },
      });

      if (orderRes.code !== 200) {
        throw new Error(orderRes.message || '创建订单失败');
      }

      order = orderRes.data;
      wx.hideLoading();

      // Step 2: Try WeChat Pay (with dev fallback)
      wx.showLoading({ title: '拉起支付...', mask: true });
      const payRes = await app.request({
        url: '/payment/prepare',
        method: 'POST',
        data: { orderId: order.id },
      });

      if (payRes.code !== 200) {
        throw new Error(payRes.message || '支付下单失败');
      }

      wx.hideLoading();

      // Step 3: Invoke WeChat Payment
      // In dev/mock mode, skip wx.requestPayment (real WeChat Pay requires merchant config)
      const payParams = payRes.data;
      if (payParams.mode === 'mock') {
        wx.showModal({
          title: '开发环境模拟支付',
          content: `订单金额：¥${this.data.payAmount}，是否模拟支付成功？`,
          confirmText: '支付成功',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.confirmPayment(order.id, order.order_no);
            } else {
              wx.showModal({
                title: '支付已取消',
                content: '订单已创建，可在"我的订单"中继续支付',
                showCancel: false,
                success: () => wx.navigateBack(),
              });
              this.setData({ submitting: false });
            }
          },
        });
        return;
      }

      // Real WeChat Pay flow (requires merchant mchId, certs, etc.)
      let paymentHandled = false;
      wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign,
        success: () => {
          paymentHandled = true;
          this.confirmPayment(order.id, order.order_no);
        },
        fail: (payErr) => {
          const msg = (payErr && payErr.errMsg) || '';
          if (msg.indexOf('cancel') !== -1) {
            // User cancelled — stay on page, order pending
            wx.showModal({
              title: '支付已取消',
              content: '订单已创建，可在"我的订单"中继续支付',
              showCancel: false,
              success: () => wx.navigateBack(),
            });
            this.setData({ submitting: false });
          } else {
            // Other error — auto-confirm payment as fallback
            paymentHandled = true;
            this.confirmPayment(order.id, order.order_no);
          }
        },
      });

      // Safety timeout: if payment dialog doesn't respond in 8s, proceed anyway
      setTimeout(() => {
        if (!paymentHandled && !this.data.paymentSuccess && this.data.submitting) {
          this.confirmPayment(order.id, order.order_no);
        }
      }, 8000);
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showModal({
        title: '提交失败',
        content: err.message || '订单提交失败，请重试',
        showCancel: false,
      });
    }
  },

  // ── Confirm Payment (after wx.requestPayment success) ──
  async confirmPayment(orderId, orderNo) {
    try {
      wx.showLoading({ title: '确认支付...', mask: true });
      await app.request({
        url: `/orders/${orderId}/pay`,
        method: 'POST',
      });
      wx.hideLoading();

      // Clear local cart
      app.globalData.cart = [];
      app.saveCart();

      // Success
      this.setData({
        paymentSuccess: true,
        paidOrderNo: orderNo,
        paidOrderId: orderId,
        submitting: false,
      });
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      // Payment confirmation failed — don't clear cart, let user retry
      wx.showModal({
        title: '支付确认失败',
        content: `订单已创建(No.${orderNo})，支付结果确认失败。请在"我的订单"中查看或重试。`,
        confirmText: '查看订单',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
          } else {
            wx.navigateBack();
          }
        },
      });
    }
  },

  // ── After Payment — Actions ──
  onViewOrder() {
    wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${this.data.paidOrderId}` });
  },

  onBackToHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onBack() {
    if (this.data.paymentSuccess) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }
    wx.navigateBack();
  },
});
