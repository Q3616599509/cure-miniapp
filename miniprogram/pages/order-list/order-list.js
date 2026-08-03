// pages/order-list/order-list.js — 订单列表页
const app = getApp();

// ── 状态配置 ──────────────────────────────────────────────
const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending_payment', label: '待付款' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
];

// 用户中心 status → 订单列表 tab key 映射
const USER_STATUS_MAP = {
  pending_payment: 'pending_payment',
  pending_shipment: 'paid',
  pending_receipt: 'shipped',
  completed: 'completed',
  after_sale: 'all',
};

// 订单状态 → 显示标签 & 颜色
const STATUS_DISPLAY = {
  pending_payment: { label: '待付款', color: '#FA5151' },
  paid: { label: '待发货', color: '#0080FF' },
  preparing: { label: '制作中', color: '#FF9500' },
  ready: { label: '待取货', color: '#07C160' },
  shipped: { label: '待收货', color: '#0080FF' },
  delivered: { label: '已送达', color: '#07C160' },
  completed: { label: '已完成', color: '#07C160' },
  cancelled: { label: '已取消', color: '#999999' },
};

// 每页条数
const PAGE_SIZE = 10;

Page({
  data: {
    // 当前激活的 tab
    activeTab: 'all',
    // tab 配置
    tabs: STATUS_TABS,

    // 订单列表
    orders: [],

    // 分页
    page: 1,
    hasMore: true,
    loadingMore: false,

    // 状态
    loading: true,
    refreshing: false,
  },

  onLoad(options) {
    // 从用户中心跳转时携带 status 参数
    if (options.status) {
      const tabKey = USER_STATUS_MAP[options.status] || 'all';
      this.setData({ activeTab: tabKey });
    }
    this.loadOrders(true);
  },

  // ── Tab 切换 ──────────────────────────────────────────
  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    const key = STATUS_TABS[index]?.key || 'all';
    if (key === this.data.activeTab) return;
    this.setData({ activeTab: key, orders: [], page: 1, hasMore: true });
    this.loadOrders(true);
  },

  // 阻止事件冒泡（空操作）
  noop() {},

  // ── 加载订单列表 ──────────────────────────────────────
  async loadOrders(isRefresh = false) {
    if (isRefresh) {
      this.setData({ loading: true, page: 1 });
    }

    try {
      const params = {
        page: this.data.page,
        page_size: PAGE_SIZE,
      };
      if (this.data.activeTab !== 'all') {
        params.status = this.data.activeTab;
      }

      const res = await app.request({
        url: '/orders',
        data: params,
      });

      if (res.code === 200) {
        const newOrders = (res.data?.list || res.data?.items || res.data || []).map((order) => {
          const display = STATUS_DISPLAY[order.status] || STATUS_DISPLAY.pending_payment;
          return {
            ...order,
            statusLabel: display.label,
            statusColor: display.color,
            // 计算商品总件数
            itemCount: (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0),
            // 商品图片列表（最多展示3张）
            itemImages: (order.items || []).slice(0, 3).map((item) => item.image || item.product_image || ''),
            // 第一件商品名（用于摘要）
            firstItemName: order.items?.[0]?.product_name || order.items?.[0]?.name || '',
          };
        });

        const hasNext = res.data?.has_more !== undefined
          ? res.data.has_more
          : res.data?.total
            ? this.data.page * PAGE_SIZE < res.data.total
            : newOrders.length >= PAGE_SIZE;

        this.setData({
          orders: isRefresh ? newOrders : [...this.data.orders, ...newOrders],
          hasMore: hasNext,
          loading: false,
          loadingMore: false,
          refreshing: false,
        });
      } else {
        wx.showToast({ title: res.message || '获取订单失败', icon: 'none' });
        this.setData({ loading: false, loadingMore: false, refreshing: false });
      }
    } catch (err) {
      console.error('加载订单列表失败:', err);
      if (err.code === 401) {
        wx.showToast({ title: '请先登录', icon: 'none' });
      } else {
        wx.showToast({ title: '网络异常', icon: 'none' });
      }
      this.setData({ loading: false, loadingMore: false, refreshing: false });
    }
  },

  // ── 下拉刷新 ──────────────────────────────────────────
  onPullDownRefresh() {
    this.setData({ refreshing: true, page: 1, hasMore: true });
    this.loadOrders(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ── 上拉加载更多 ──────────────────────────────────────
  onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore || this.data.loading) return;
    this.setData({
      loadingMore: true,
      page: this.data.page + 1,
    });
    this.loadOrders(false);
  },

  // ── 跳转订单详情 ──────────────────────────────────────
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`,
    });
  },

  // ── 订单操作 ──────────────────────────────────────────

  // 去支付
  async onPay(e) {
    const id = e.currentTarget.dataset.id;
    try {
      // Step 1: Get prepay params from backend
      const prepayRes = await app.request({
        url: '/payment/prepare',
        method: 'POST',
        data: { orderId: id },
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
          // Step 3: Confirm payment on backend
          try {
            const res = await app.request({
              url: `/orders/${id}/pay`,
              method: 'POST',
            });
            if (res.code === 200) {
              wx.showToast({ title: '支付成功', icon: 'success' });
              this.refreshCurrentTab();
            }
          } catch (err) {
            console.error('支付确认失败:', err);
            wx.showToast({ title: '支付成功，订单处理中', icon: 'success' });
            this.refreshCurrentTab();
          }
        },
        fail: (err) => {
          console.error('支付失败:', err);
          if (err.errMsg.includes('cancel')) {
            wx.showToast({ title: '支付已取消', icon: 'none' });
          } else {
            wx.showToast({ title: '支付失败，请重试', icon: 'none' });
          }
        },
      });
    } catch (err) {
      console.error('支付失败:', err);
      wx.showToast({ title: err.message || '支付失败', icon: 'none' });
    }
  },

  // 取消订单
  onCancel(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定取消此订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.request({
              url: `/orders/${id}/cancel`,
              method: 'PUT',
            });
            if (result.code === 200) {
              wx.showToast({ title: '已取消', icon: 'none' });
              this.refreshCurrentTab();
            } else {
              wx.showToast({ title: result.message || '取消失败', icon: 'none' });
            }
          } catch (err) {
            console.error('取消订单失败:', err);
            wx.showToast({ title: '取消失败', icon: 'none' });
          }
        }
      },
    });
  },

  // 确认收货
  onConfirm(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确认已收到商品？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.request({
              url: `/orders/${id}/confirm`,
              method: 'PUT',
            });
            if (result.code === 200) {
              wx.showToast({ title: '已确认收货', icon: 'success' });
              this.refreshCurrentTab();
            } else {
              wx.showToast({ title: result.message || '确认失败', icon: 'none' });
            }
          } catch (err) {
            console.error('确认收货失败:', err);
            wx.showToast({ title: '确认失败', icon: 'none' });
          }
        }
      },
    });
  },

  // 再次购买
  async onBuyAgain(e) {
    const id = e.currentTarget.dataset.id;
    const order = this.data.orders.find((o) => o.id === id);
    if (!order || !order.items) return;

    wx.showLoading({ title: '处理中...', mask: true });
    try {
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
      await Promise.all(tasks);
      wx.hideLoading();
      wx.showToast({ title: '已加入购物车', icon: 'success' });
      app.getCartCount();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 刷新当前 tab 数据
  refreshCurrentTab() {
    this.setData({
      orders: [],
      page: 1,
      hasMore: true,
    });
    this.loadOrders(true);
  },

  // ── 空操作（阻止事件冒泡） ────────────────────────────
  noop() {},

  // ── 分享 ──────────────────────────────────────────────
  onShareAppMessage() {
    return {
      title: 'Cure 治愈优选 — 我的订单',
      path: '/pages/index/index',
    };
  },
});
