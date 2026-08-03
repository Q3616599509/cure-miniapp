// pages/favorites/favorites.js — Favorites
const app = getApp();
const { formatPrice, formatSales, showToast, showModal } = require('../../utils/util');
const { sanitizeProducts } = require('../../utils/image.js');

Page({
  data: {
    favorites: [],
    loading: true,
    manageMode: false,
    selectedIds: [],
    batchDeleteText: '取消收藏',
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
      this.loadFavorites();
    } else {
      this.setData({ loading: false });
    }
  },

  async loadFavorites() {
    this.setData({ loading: true });
    try {
      const res = await app.request({ url: '/favorites' });
      if (res.code === 200) {
        const favorites = sanitizeProducts(res.data || []).map(f => ({
          ...f,
          displayPrice: formatPrice(f.sale_price || f.price),
          originalPrice: f.price > (f.sale_price || f.price) ? formatPrice(f.price) : '',
          salesText: formatSales(f.sales || 0) + '人购买',
          isSelected: false,
        }));
        this.setData({ favorites });
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
      if (err.code === 401) {
        this.setData({ isLoggedIn: false });
      } else {
        showToast('收藏加载失败');
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  // ── Product Tap ──
  onProductTap(e) {
    if (this.data.manageMode) {
      this.toggleSelect(e);
      return;
    }
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/product/product?id=${productId}` });
  },

  // ── Manage Mode ──
  onManageTap() {
    this.setData({
      manageMode: !this.data.manageMode,
      selectedIds: [],
    });
    // Reset selection state
    const favorites = this.data.favorites.map(f => ({ ...f, isSelected: false }));
    this.setData({ favorites });
  },

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const favorites = this.data.favorites.map(f => {
      if (f.product_id === id) {
        f.isSelected = !f.isSelected;
      }
      return f;
    });
    const selectedIds = favorites.filter(f => f.isSelected).map(f => f.product_id);
    const batchDeleteText = selectedIds.length > 0 ? `取消收藏(${selectedIds.length})` : '取消收藏';
    this.setData({ favorites, selectedIds, batchDeleteText });
  },

  // ── Select All ──
  onSelectAll() {
    const allSelected = this.data.selectedIds.length === this.data.favorites.length;
    const favorites = this.data.favorites.map(f => ({ ...f, isSelected: !allSelected }));
    const selectedIds = allSelected ? [] : favorites.map(f => f.product_id);
    const batchDeleteText = selectedIds.length > 0 ? `取消收藏(${selectedIds.length})` : '取消收藏';
    this.setData({ favorites, selectedIds, batchDeleteText });
  },

  // ── Batch Unfavorite ──
  async onBatchUnfavorite() {
    if (this.data.selectedIds.length === 0) {
      showToast('请先选择商品');
      return;
    }

    const res = await showModal({
      title: '提示',
      content: `确定取消收藏选中的${this.data.selectedIds.length}个商品吗？`,
    });
    if (!res.confirm) return;

    wx.showLoading({ title: '取消中...' });
    try {
      // Delete each selected favorite
      const deletePromises = this.data.selectedIds.map(id =>
        app.request({ url: `/favorites/${id}`, method: 'DELETE' })
      );
      await Promise.all(deletePromises);
      wx.hideLoading();
      showToast('已取消收藏', 'success');
      this.setData({ manageMode: false, selectedIds: [] });
      this.loadFavorites();
    } catch (err) {
      wx.hideLoading();
      showToast(err.message || '操作失败');
    }
  },

  // ── Single Unfavorite ──
  async onUnfavorite(e) {
    const id = e.currentTarget.dataset.id;
    const res = await showModal({
      title: '提示',
      content: '确定取消收藏该商品吗？',
    });
    if (!res.confirm) return;

    try {
      await app.request({ url: `/favorites/${id}`, method: 'DELETE' });
      showToast('已取消收藏', 'success');
      this.loadFavorites();
    } catch (err) {
      showToast(err.message || '操作失败');
    }
  },

  // ── Login ──
  onLoginTap() {
    wx.switchTab({ url: '/pages/user/user' });
  },

  // ── Go Shopping ──
  goShopping() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
