// pages/user/user.js — Personal Center
const app = getApp();
const { formatPrice, showToast } = require('../../utils/util');

const LEVEL_NAMES = ['普通会员', '银卡会员', '金卡会员', '钻石会员'];
const LEVEL_ICONS = ['🥉', '🥈', '🥇', '💎'];

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    levelName: '',
    levelIcon: '',
    points: 0,
    couponCount: 0,
    // Order status badges
    orderBadges: {
      pending_payment: 0,
      pending_shipment: 0,
      pending_receipt: 0,
      completed: 0,
      after_sale: 0,
    },
    // Function list
    funcList: [
      { icon: '📍', name: '收货地址', path: '/pages/address/address' },
      { icon: '💰', name: '账户余额', path: '/pages/balance/balance' },
      { icon: '❤️', name: '我的收藏', path: '/pages/favorites/favorites' },
      { icon: '🎫', name: '优惠券', path: '/pages/coupons/coupons' },
      { icon: '🎁', name: '积分商城', path: '/pages/points/points' },
      { icon: '📄', name: '发票管理', path: '' },
    ],
  },

  onLoad() {
    this.refreshUserInfo();
  },

  onShow() {
    this.refreshUserInfo();
  },

  refreshUserInfo() {
    const loggedIn = app.isLoggedIn();
    const userInfo = app.globalData.userInfo;
    if (loggedIn && userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo,
        levelName: LEVEL_NAMES[userInfo.level] || '普通会员',
        levelIcon: LEVEL_ICONS[userInfo.level] || '🥉',
        points: userInfo.points || 0,
      });
      this.loadMemberData();
      this.loadOrderBadges();
    } else {
      this.setData({ isLoggedIn: false });
    }
  },

  async loadMemberData() {
    try {
      const res = await app.request({ url: '/member/info' });
      if (res.code === 200) {
        this.setData({
          points: res.data.points || 0,
          levelName: res.data.level_name || LEVEL_NAMES[res.data.level] || '普通会员',
          levelIcon: LEVEL_ICONS[res.data.level] || '🥉',
          'userInfo.level': res.data.level,
          'userInfo.points': res.data.points,
        });
      }
    } catch (err) {
      console.error('Failed to load member info:', err);
    }

    try {
      const res = await app.request({ url: '/member/my-coupons' });
      if (res.code === 200) {
        const unusedCount = (res.data || []).filter(c => c.status === 'unused').length;
        this.setData({ couponCount: unusedCount });
      }
    } catch (err) {
      console.error('Failed to load coupons count:', err);
    }
  },

  async loadOrderBadges() {
    // Fetch real order counts per status — one call per status to avoid heavy list loads
    const statuses = ['pending_payment', 'pending_shipment', 'pending_receipt', 'completed', 'after_sale'];
    const badges = { pending_payment: 0, pending_shipment: 0, pending_receipt: 0, completed: 0, after_sale: 0 };

    const results = await Promise.allSettled(
      statuses.map(status =>
        app.request({ url: '/orders', data: { status, page: 1, page_size: 1 } })
      )
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value && result.value.code === 200) {
        // Some backends return { total } alongside list; fall back to list length
        const total = result.value.total ?? result.value.data?.total ?? (result.value.data?.list || result.value.data || []).length;
        badges[statuses[i]] = typeof total === 'number' ? total : 0;
      }
      // On failure, keep default 0 — no fake data
    });

    this.setData({
      orderBadges: badges,
    });
  },

  // ── Login ──
  async onWxLogin(e) {
    if (e.detail.errMsg && e.detail.errMsg !== 'getUserProfile:ok') {
      showToast('已取消授权');
      return;
    }

    wx.showLoading({ title: '登录中...' });
    try {
      // Use getUserProfile for user info
      const userProfile = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善个人资料',
          success: resolve,
          fail: reject,
        });
      });

      const { nickName, avatarUrl } = userProfile.userInfo;
      const data = await app.login(nickName, avatarUrl);
      wx.hideLoading();
      this.refreshUserInfo();
      showToast('登录成功', 'success');
    } catch (err) {
      wx.hideLoading();
      if (err.errMsg && err.errMsg.includes('deny')) {
        showToast('已取消授权');
      } else {
        showToast(err.message || '登录失败');
      }
    }
  },

  // ── Navigation ──
  goToOrderList(e) {
    const status = e.currentTarget.dataset.status || '';
    if (status) {
      wx.navigateTo({ url: `/pages/order-list/order-list?status=${status}` });
    } else {
      wx.navigateTo({ url: '/pages/order-list/order-list' });
    }
  },

  goToMember() {
    wx.switchTab({ url: '/pages/member/member' });
  },

  goToCoupons() {
    wx.navigateTo({ url: '/pages/coupons/coupons' });
  },

  goToPoints() {
    wx.navigateTo({ url: '/pages/points/points' });
  },

  onFuncTap(e) {
    const path = e.currentTarget.dataset.path;
    if (!path) {
      showToast('功能开发中');
      return;
    }
    wx.navigateTo({ url: path });
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  onShareAppMessage() {
    return {
      title: 'Cure 治愈优选 — 治愈你的日常好物',
      path: '/pages/index/index',
      imageUrl: '',
    };
  },

  onShareTimeline() {
    return {
      title: 'Cure 治愈优选 — 治愈你的日常好物',
    };
  },
});
