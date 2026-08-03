// pages/member/member.js — Member Center
const app = getApp();
const { formatPrice, formatDate, showToast } = require('../../utils/util');

// Level themes
const LEVEL_THEMES = {
  0: { name: '普通会员', gradient: 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)', icon: '🥉' },
  1: { name: '银卡会员', gradient: 'linear-gradient(135deg, #B0BEC5 0%, #78909C 100%)', icon: '🥈' },
  2: { name: '金卡会员', gradient: 'linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)', icon: '🥇' },
  3: { name: '钻石会员', gradient: 'linear-gradient(135deg, #4FC3F7 0%, #1976D2 100%)', icon: '💎' },
};

Page({
  data: {
    memberInfo: null,
    pointsLog: [],
    loading: true,
    levelTheme: null,
    nextLevelName: '',
    growthRemaining: 0,
    discountText: '',
    freeShippingText: '',
    isLoggedIn: false,
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    this.checkLogin();
  },

  checkLogin() {
    const loggedIn = app.isLoggedIn();
    this.setData({ isLoggedIn: loggedIn });
    if (loggedIn) {
      this.loadMemberInfo();
      this.loadPointsLog();
    } else {
      this.setData({ loading: false });
    }
  },

  async loadMemberInfo() {
    this.setData({ loading: true });
    try {
      const res = await app.request({ url: '/member/info' });
      if (res.code === 200) {
        const info = res.data;
        const theme = LEVEL_THEMES[info.level] || LEVEL_THEMES[0];
        const levelNames = info.level_names || ['普通会员', '银卡会员', '金卡会员', '钻石会员'];
        const nextLevelName = info.level < 3 ? levelNames[info.level + 1] : '';
        const growthThresholds = info.growth_thresholds || [0, 500, 2000, 5000, Infinity];
        const growthRemaining = info.level < 3
          ? (growthThresholds[info.level + 1] || 0) - info.growth
          : 0;

        this.setData({
          memberInfo: info,
          levelTheme: theme,
          nextLevelName,
          growthRemaining: Math.max(0, growthRemaining),
          discountText: info.discount < 1 ? (info.discount * 10).toFixed(1) + '折' : '无折扣',
          freeShippingText: info.free_shipping_threshold === 0 ? '免运费' : '满' + info.free_shipping_threshold + '元',
          loading: false,
        });
      }
    } catch (err) {
      console.error('Failed to load member info:', err);
      if (err.code === 401) {
        this.setData({ isLoggedIn: false, loading: false });
      } else {
        showToast('会员信息加载失败');
        this.setData({ loading: false });
      }
    }
  },

  async loadPointsLog() {
    try {
      const res = await app.request({ url: '/member/points-log', data: { page: 1, page_size: 10 } });
      if (res.code === 200) {
        const logs = (res.data.list || []).map(log => ({
          ...log,
          amountText: log.amount > 0 ? '+' + log.amount : String(log.amount),
          isEarn: log.amount > 0,
          timeText: formatDate(log.created_at, 'MM-DD HH:mm'),
        }));
        this.setData({ pointsLog: logs });
      }
    } catch (err) {
      console.error('Failed to load points log:', err);
    }
  },

  onPullDownRefresh() {
    this.checkLogin();
    setTimeout(() => wx.stopPullDownRefresh(), 1000);
  },

  onLoginTap() {
    wx.switchTab({ url: '/pages/user/user' });
  },

  goToPoints() {
    wx.navigateTo({ url: '/pages/points/points' });
  },

  goToCoupons() {
    wx.navigateTo({ url: '/pages/coupons/coupons' });
  },

  onShareAppMessage() {
    return {
      title: 'Cure 会员中心 — 享专属折扣与积分',
      path: '/pages/member/member',
    };
  },
});
