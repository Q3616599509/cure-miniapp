// pages/order-detail/order-detail.js — 订单详情页
const app = getApp();

// 订单状态配置
const STATUS_CONFIG = {
  pending_payment: { label: '待付款', icon: 'wallet', color: '#FA5151', desc: '请尽快完成支付' },
  paid: { label: '已付款', icon: 'time', color: '#0080FF', desc: '商家正在准备发货' },
  preparing: { label: '制作中', icon: 'time', color: '#FF9500', desc: '商家正在制作您的商品' },
  ready: { label: '待取货', icon: 'shop', color: '#07C160', desc: '商品已就绪，请尽快取货' },
  shipped: { label: '已发货', icon: 'deliver', color: '#0080FF', desc: '商品已发出，请注意查收' },
  delivered: { label: '已送达', icon: 'location', color: '#07C160', desc: '商品已送达，请确认收货' },
  completed: { label: '已完成', icon: 'check-circle', color: '#07C160', desc: '订单已完成' },
  cancelled: { label: '已取消', icon: 'close-circle', color: '#999999', desc: '订单已取消' },
};

// 状态时间线
function getTimeline(status, orderType) {
  if (status === 'cancelled') {
    return [
      { label: '提交订单', active: true, done: true },
      { label: '订单取消', active: true, done: true, isCancel: true },
    ];
  }

  if (orderType === 'instant') {
    const steps = [
      { label: '提交订单', active: true, done: true },
      { label: '支付成功', key: 'pending_payment', done: false },
      { label: '制作中', key: 'paid', done: false },
      { label: '待取货', key: 'preparing', done: false },
      { label: '已完成', key: 'ready', done: false },
    ];
    const statusOrder = ['pending_payment', 'paid', 'preparing', 'ready', 'completed'];
    const currentIdx = statusOrder.indexOf(status);
    steps.forEach((step, i) => {
      if (i <= currentIdx) {
        step.done = true;
        step.active = i === currentIdx;
      }
    });
    return steps;
  }

  // mall orders
  const steps = [
    { label: '提交订单', active: true, done: true },
    { label: '支付成功', key: 'pending_payment', done: false },
    { label: '商家发货', key: 'paid', done: false },
    { label: '确认收货', key: 'shipped', done: false },
    { label: '交易完成', key: 'completed', done: false },
  ];
  const statusOrder = ['pending_payment', 'paid', 'shipped', 'delivered', 'completed'];
  const currentIdx = statusOrder.indexOf(status);
  steps.forEach((step, i) => {
    if (i <= currentIdx) {
      step.done = true;
      step.active = i === currentIdx;
    }
  });
  return steps;
}

Page({
  data: {
    orderId: null,
    order: null,
    loading: true,
    statusConfig: null,
    timeline: [],
    address: null,
    store: null,
  },

  onLoad(options) {
    this.setData({ orderId: options.id });
    this.loadOrder();
  },

  // ── 加载订单详情 ─────────────────────────────────────
  async loadOrder() {
    try {
      const res = await app.request({
        url: `/orders/${this.data.orderId}`,
      });
      if (res.code === 200) {
        const order = res.data;
        const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_payment;
        const timeline = getTimeline(order.status, order.type);

        this.setData({
          order,
          statusConfig,
          timeline,
          loading: false,
        });

        // 加载关联信息
        if (order.address_id) {
          this.loadAddress(order.address_id);
        }
        if (order.store_id) {
          this.loadStore(order.store_id);
        }
      } else {
        wx.showToast({ title: res.message || '订单不存在', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('加载订单失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // ── 加载地址信息 ─────────────────────────────────────
  async loadAddress(addressId) {
    try {
      const res = await app.request({ url: '/addresses' });
      if (res.code === 200) {
        const address = res.data.find((a) => a.id === addressId);
        this.setData({ address });
      }
    } catch (err) {
      console.error('加载地址失败:', err);
    }
  },

  // ── 加载门店信息 ─────────────────────────────────────
  async loadStore(storeId) {
    try {
      const res = await app.request({ url: `/stores/${storeId}` });
      if (res.code === 200) {
        this.setData({ store: res.data });
      }
    } catch (err) {
      console.error('加载门店失败:', err);
    }
  },

  // ── 去支付 ───────────────────────────────────────────
  async onPay() {
    const orderId = this.data.order.id;
    try {
      // Step 1: Get prepay params
      const prepayRes = await app.request({
        url: '/payment/prepare',
        method: 'POST',
        data: { orderId },
        showLoading: true,
        loadingText: '准备支付',
      });

      if (prepayRes.code !== 200) {
        wx.showToast({ title: prepayRes.message || '获取支付参数失败', icon: 'none' });
        return;
      }

      const payParams = prepayRes.data;

      // Step 2: Call WeChat Pay
      wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType || 'MD5',
        paySign: payParams.paySign,
        success: async () => {
          try {
            await app.request({ url: `/orders/${orderId}/pay`, method: 'POST' });
          } catch (_) {}
          wx.showToast({ title: '支付成功', icon: 'success' });
          this.loadOrder();
        },
        fail: (err) => {
          if (err.errMsg.includes('cancel')) {
            wx.showToast({ title: '支付已取消', icon: 'none' });
          } else {
            wx.showToast({ title: '支付失败，请重试', icon: 'none' });
          }
        },
      });
    } catch (err) {
      console.error('支付失败:', err);
    }
  },

  // ── 取消订单 ─────────────────────────────────────────
  onCancel() {
    wx.showModal({
      title: '提示',
      content: '确定取消此订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.request({
              url: `/orders/${this.data.order.id}/cancel`,
              method: 'PUT',
              showLoading: true,
              loadingText: '取消中',
            });
            if (result.code === 200) {
              wx.showToast({ title: '已取消', icon: 'none' });
              this.loadOrder();
            }
          } catch (err) {
            console.error('取消订单失败:', err);
          }
        }
      },
    });
  },

  // ── 确认收货 ─────────────────────────────────────────
  onConfirmReceipt() {
    wx.showModal({
      title: '提示',
      content: '确认已收到商品？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.request({
              url: `/orders/${this.data.order.id}/confirm`,
              method: 'PUT',
              showLoading: true,
              loadingText: '确认中',
            });
            if (result.code === 200) {
              wx.showToast({ title: '已确认收货', icon: 'success' });
              this.loadOrder();
            }
          } catch (err) {
            console.error('确认收货失败:', err);
          }
        }
      },
    });
  },

  // ── 再次购买 ─────────────────────────────────────────
  onBuyAgain() {
    const { order } = this.data;
    if (!order || !order.items) return;

    // 将订单商品加入购物车
    wx.showLoading({ title: '处理中...', mask: true });
    const tasks = order.items.map((item) =>
      app.request({
        url: '/cart',
        method: 'POST',
        data: {
          product_id: item.product_id,
          sku_id: item.sku_id,
          quantity: item.quantity,
        },
      })
    );

    Promise.all(tasks)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '已加入购物车', icon: 'success' });
        app.getCartCount();
        setTimeout(() => {
          wx.navigateTo({ url: '/pages/cart/cart' });
        }, 1500);
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '操作失败', icon: 'none' });
      });
  },

  // ── 去评价 ───────────────────────────────────────────
  onReview() {
    wx.showToast({ title: '评价功能开发中', icon: 'none' });
  },

  // ── 复制订单号 ───────────────────────────────────────
  onCopyOrderNo() {
    wx.setClipboardData({
      data: this.data.order.order_no,
      success: () => {
        wx.showToast({ title: '已复制订单号', icon: 'none' });
      },
    });
  },

  // ── 分享 ─────────────────────────────────────────────
  onShareAppMessage() {
    return {
      title: `Cure 订单：${this.data.order?.order_no || ''}`,
      path: `/pages/order-detail/order-detail?id=${this.data.orderId}`,
    };
  },
});
