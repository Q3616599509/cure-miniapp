// pages/coupons/coupons.js — Coupons Center
const app = getApp();
const { formatDate, showToast } = require('../../utils/util');

Page({
  data: {
    activeTab: 0, // 0: available, 1: my coupons
    availableCoupons: [],
    myCoupons: [],
    myCouponFilter: 0, // 0: unused, 1: used, 2: expired
    filteredMyCoupons: [],
    loading: true,
    isLoggedIn: false,
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
      this.loadAvailableCoupons();
    }
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      await Promise.all([
        this.loadAvailableCoupons(),
        this.loadMyCoupons(),
      ]);
    } catch (err) {
      console.error('Failed to load coupons:', err);
      showToast('优惠券加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadAvailableCoupons() {
    try {
      const res = await app.request({ url: '/member/coupons/available' });
      if (res.code === 200) {
        const coupons = (res.data || []).map(c => ({
          ...c,
          typeText: this.getCouponTypeText(c.type),
          valueText: this.formatCouponValue(c),
          thresholdText: c.threshold > 0 ? `满${c.threshold}元可用` : '无门槛',
          validText: `有效期${c.valid_days}天`,
        }));
        this.setData({ availableCoupons: coupons });
      }
    } catch (err) {
      console.error('Failed to load available coupons:', err);
    }
  },

  async loadMyCoupons() {
    try {
      const res = await app.request({ url: '/member/my-coupons' });
      if (res.code === 200) {
        const coupons = (res.data || []).map(c => ({
          ...c,
          typeText: this.getCouponTypeText(c.type),
          valueText: this.formatCouponValue(c),
          thresholdText: c.threshold > 0 ? `满${c.threshold}元可用` : '无门槛',
          expireText: formatDate(c.expire_at, 'YYYY-MM-DD'),
          statusText: this.getCouponStatusText(c.status),
          isExpired: c.status === 'expired',
          isUsed: c.status === 'used',
        }));
        this.setData({ myCoupons: coupons });
        this.updateFilteredCoupons();
      }
    } catch (err) {
      console.error('Failed to load my coupons:', err);
      if (err.code === 401) {
        this.setData({ isLoggedIn: false });
      }
    }
  },

  getCouponTypeText(type) {
    const map = {
      full_reduction: '满减券',
      discount: '折扣券',
      free_delivery: '免运费券',
    };
    return map[type] || '优惠券';
  },

  formatCouponValue(coupon) {
    if (coupon.type === 'discount') {
      return (coupon.value * 10).toFixed(1).replace(/\.0$/, '') + '折';
    }
    if (coupon.type === 'free_delivery') {
      return '免运费';
    }
    return coupon.value;
  },

  getCouponStatusText(status) {
    const map = { unused: '未使用', used: '已使用', expired: '已过期' };
    return map[status] || '未使用';
  },

  onTabChange(e) {
    this.setData({ activeTab: e.detail.value });
  },

  onMyCouponFilterChange(e) {
    this.setData({ myCouponFilter: parseInt(e.currentTarget.dataset.value) });
    this.updateFilteredCoupons();
  },

  updateFilteredCoupons() {
    const statusMap = ['unused', 'used', 'expired'];
    const targetStatus = statusMap[this.data.myCouponFilter];
    const filtered = this.data.myCoupons.filter(c => c.status === targetStatus);
    this.setData({ filteredMyCoupons: filtered });
  },

  async onClaimCoupon(e) {
    if (!app.isLoggedIn()) {
      wx.showModal({
        title: '请先登录',
        content: '领取优惠券需要先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) wx.switchTab({ url: '/pages/user/user' });
        },
      });
      return;
    }

    const coupon = e.currentTarget.dataset.coupon;
    try {
      wx.showLoading({ title: '领取中...' });
      const res = await app.request({
        url: `/member/receive-coupon/${coupon.id}`,
        method: 'POST',
      });
      wx.hideLoading();
      if (res.code === 200) {
        showToast('领取成功', 'success');
        this.loadMyCoupons();
      } else {
        showToast(res.message || '领取失败');
      }
    } catch (err) {
      wx.hideLoading();
      showToast(err.message || '领取失败');
    }
  },

  onLoginTap() {
    wx.switchTab({ url: '/pages/user/user' });
  },
});
