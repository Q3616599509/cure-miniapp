// pages/settings/settings.js — Settings
const app = getApp();
const { showToast, showModal } = require('../../utils/util');

Page({
  data: {
    cacheSize: '0 KB',
    version: '1.0.0',
    showLogoutConfirm: false,
    isLoggedIn: false,
  },

  onLoad() {
    this.setData({ isLoggedIn: app.isLoggedIn() });
    this.getCacheSize();
  },

  // ── Cache Size ──
  getCacheSize() {
    wx.getStorageInfo({
      success: (res) => {
        const sizeKB = res.currentSize; // in KB
        this.setData({
          cacheSize: this.formatSize(sizeKB),
        });
      },
      fail: () => {
        this.setData({ cacheSize: '0 KB' });
      },
    });
  },

  formatSize(kb) {
    if (kb < 1024) {
      return kb + ' KB';
    }
    return (kb / 1024).toFixed(2) + ' MB';
  },

  // ── Clear Cache ──
  async onClearCache() {
    const res = await showModal({
      title: '清除缓存',
      content: '清除缓存不会删除您的账户信息，但会清除本地存储的浏览记录和临时数据。确定清除吗？',
      confirmText: '清除',
      confirmColor: '#FF4D4F',
    });
    if (!res.confirm) return;

    wx.showLoading({ title: '清除中...' });
    try {
      // Preserve token and userInfo
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');

      await new Promise((resolve) => {
        wx.clearStorage({
          success: resolve,
          fail: resolve,
        });
      });

      // Restore essential data
      if (token) wx.setStorageSync('token', token);
      if (userInfo) wx.setStorageSync('userInfo', userInfo);

      wx.hideLoading();
      this.setData({ cacheSize: '0 KB' });
      showToast('缓存已清除', 'success');
    } catch (err) {
      wx.hideLoading();
      showToast('清除失败');
    }
  },

  // ── About ──
  onAboutTap() {
    wx.showModal({
      title: '关于 Cure',
      content: 'Cure 治愈优选 v' + this.data.version + '\n\n治愈你的日常好物\n线上下单 · 线下履约 · 会员尊享\n\n© 2026 Cure. All rights reserved.',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ── Privacy Policy ──
  onPrivacyTap() {
    wx.navigateTo({
      url: '/pages/settings/privacy',
      fail: () => {
        // Fallback: show in modal if page doesn't exist
        wx.showModal({
          title: '隐私政策',
          content: 'Cure 重视您的隐私。我们收集的信息仅用于提供服务：\n\n1. 微信登录信息用于身份验证\n2. 收货地址用于订单配送\n3. 位置信息用于查找附近门店\n\n我们不会向第三方分享您的个人信息，所有数据均加密存储。',
          showCancel: false,
          confirmText: '我已了解',
        });
      },
    });
  },

  // ── Check Update ──
  onCheckUpdate() {
    const updateManager = wx.getUpdateManager && wx.getUpdateManager();
    if (!updateManager) {
      showToast('当前版本不支持在线更新');
      return;
    }
    showToast('检查中...');
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        showToast('发现新版本，正在下载...');
      } else {
        showToast('已是最新版本');
      }
    });
  },

  // ── Logout ──
  async onLogout() {
    const res = await showModal({
      title: '退出登录',
      content: '退出后需重新登录才能使用完整功能，确定退出吗？',
      confirmText: '退出',
      confirmColor: '#FF4D4F',
    });
    if (!res.confirm) return;

    app.logout();
    this.setData({ isLoggedIn: false });
    showToast('已退出登录', 'success');
    setTimeout(() => {
      wx.switchTab({ url: '/pages/user/user' });
    }, 500);
  },
});
