// pages/points/points.js — Points Mall
const app = getApp();
const { formatDate, showToast } = require('../../utils/util');

Page({
  data: {
    pointsBalance: 0,
    memberLevel: 0,
    pointsMultiplier: 1,
    exchangeProducts: [],
    exchangeHistory: [],
    loading: true,
    isLoggedIn: false,
    activeTab: 0,
  },

  onLoad() {
    this.checkLogin();
  },

  checkLogin() {
    const loggedIn = app.isLoggedIn();
    this.setData({ isLoggedIn: loggedIn });
    if (loggedIn) {
      this.loadData();
    } else {
      this.setData({ loading: false });
    }
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      await Promise.all([
        this.loadMemberInfo(),
        this.loadExchangeProducts(),
        this.loadExchangeHistory(),
      ]);
    } catch (err) {
      console.error('Failed to load data:', err);
      if (err.code === 401) {
        this.setData({ isLoggedIn: false });
      } else {
        showToast('数据加载失败');
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMemberInfo() {
    const res = await app.request({ url: '/member/info' });
    if (res.code === 200) {
      this.setData({
        pointsBalance: res.data.points || 0,
        memberLevel: res.data.level || 0,
        pointsMultiplier: res.data.points_multiplier || 1,
      });
    }
  },

  async loadExchangeProducts() {
    // Mock exchange products (points mall)
    // In production, this would be an API call: GET /v1/products/points-exchange
    const products = [
      { id: 1, name: '满50减15优惠券', image: '🎫', points: 500, cash: 0, type: 'coupon' },
      { id: 2, name: '免运费券', image: '🚚', points: 300, cash: 0, type: 'coupon' },
      { id: 3, name: '竹纤维抽纸', image: '🧻', points: 800, cash: 9.9, type: 'product' },
      { id: 4, name: '即食鸡胸肉', image: '🍗', points: 600, cash: 5.9, type: 'product' },
      { id: 5, name: '每日坚果混合装', image: '🥜', points: 1500, cash: 29.9, type: 'product' },
      { id: 6, name: '8折优惠券', image: '💰', points: 1000, cash: 0, type: 'coupon' },
      { id: 7, name: '快充数据线', image: '🔌', points: 2000, cash: 19.9, type: 'product' },
      { id: 8, name: '100积分抽奖券', image: '🎰', points: 100, cash: 0, type: 'coupon' },
    ];
    this.setData({ exchangeProducts: products });
  },

  async loadExchangeHistory() {
    // Mock exchange history
    const history = [
      { id: 1, name: '满50减15优惠券', points: 500, time: '2026-07-28 14:30' },
      { id: 2, name: '免运费券', points: 300, time: '2026-07-15 09:20' },
      { id: 3, name: '即食鸡胸肉', points: 600, time: '2026-06-30 18:45' },
    ];
    this.setData({ exchangeHistory: history });
  },

  onTabChange(e) {
    this.setData({ activeTab: e.detail.value });
  },

  onExchange(e) {
    const product = e.currentTarget.dataset.product;
    if (this.data.pointsBalance < product.points) {
      showToast('积分不足，无法兑换');
      return;
    }
    wx.showModal({
      title: '确认兑换',
      content: `兑换「${product.name}」需要${product.points}积分${product.cash > 0 ? ' + ¥' + product.cash : ''}，确认兑换吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '兑换中...' });
          // In production: POST /v1/member/points-exchange
          setTimeout(() => {
            wx.hideLoading();
            this.setData({
              pointsBalance: this.data.pointsBalance - product.points,
            });
            showToast('兑换成功', 'success');
            this.loadExchangeHistory();
          }, 800);
        }
      },
    });
  },

  goToPointsLog() {
    wx.switchTab({ url: '/pages/member/member' });
  },

  onLoginTap() {
    wx.switchTab({ url: '/pages/user/user' });
  },
});
