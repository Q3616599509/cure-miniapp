// pages/index/index.js — 首页
const app = getApp();
const { sanitizeProduct } = require('../../utils/image.js');

Page({
  data: {
    // Banner 轮播
    banners: [
      { id: 1, image: '/assets/banner-placeholder.png', link: '' },
      { id: 2, image: '/assets/banner-placeholder.png', link: '' },
      { id: 3, image: '/assets/banner-placeholder.png', link: '' },
      { id: 4, image: '/assets/banner-placeholder.png', link: '' },
    ],
    bannerCurrent: 0,

    // 品类导航
    categories: [
      { id: 1, name: '咖啡茶饮', icon: '☕' },
      { id: 2, name: '食品零食', icon: '🍪' },
      { id: 3, name: '家居日用', icon: '🏠' },
      { id: 4, name: '数码配件', icon: '📱' },
      { id: 5, name: '美妆个护', icon: '💄' },
      { id: 6, name: '服饰鞋包', icon: '👗' },
      { id: 7, name: '图书文具', icon: '📚' },
    ],

    // 限时抢购
    flashSaleProducts: [],
    countdown: { hours: '00', minutes: '00', seconds: '00' },
    flashSaleEnd: 0,
    flashSaleTimer: null,

    // 热销推荐
    hotProducts: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loadingMore: false,

    // 状态
    loading: true,
    refreshing: false,
    cartCount: 0,

    // 导航栏高度
    statusBarHeight: 20,
    navBarHeight: 108,
  },

  onLoad() {
    // 计算自定义导航栏高度
    const sysInfo = app.globalData.systemInfo || wx.getSystemInfoSync();
    const statusBarHeight = sysInfo.statusBarHeight || 20;
    const navBarHeight = statusBarHeight + 44;
    this.setData({ statusBarHeight, navBarHeight });

    this.loadData();
    this.initFlashSale();
  },

  onShow() {
    // 刷新购物车数量
    this.setData({ cartCount: app.globalData.cartCount });
  },

  onHide() {
    if (this.data.flashSaleTimer) {
      clearInterval(this.data.flashSaleTimer);
    }
  },

  onUnload() {
    if (this.data.flashSaleTimer) {
      clearInterval(this.data.flashSaleTimer);
    }
  },

  // ── 加载数据 ────────────────────────────────────────
  async loadData() {
    try {
      await Promise.all([
        this.loadHotProducts(true),
        this.loadFlashSale(),
      ]);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // ── 热销推荐 ─────────────────────────────────────────
  async loadHotProducts(reset = false) {
    const page = reset ? 1 : this.data.page;
    return this.loadHotProductsPage(page, reset);
  },

  async loadHotProductsPage(page, reset = false) {
    const res = await app.request({
      url: '/products',
      data: {
        is_hot: 1,
        page,
        page_size: this.data.pageSize,
      },
    });

    if (res.code === 200) {
      const list = (res.data.list || []).map(p => sanitizeProduct(p));
      const products = reset ? list : [...this.data.hotProducts, ...list];
      this.setData({
        hotProducts: products,
        total: res.data.total,
        hasMore: products.length < res.data.total,
        loadingMore: false,
      });
    }
  },

  // ── 限时抢购 ─────────────────────────────────────────
  async loadFlashSale() {
    try {
      const res = await app.request({
        url: '/products',
        data: { is_hot: 1, page_size: 6, sort: 'sales' },
      });
      if (res.code === 200) {
        this.setData({ flashSaleProducts: (res.data.list.slice(0, 6)).map(p => sanitizeProduct(p)) });
      }
    } catch (err) {
      console.error('加载限时抢购失败:', err);
    }
  },

  // ── 初始化倒计时 ─────────────────────────────────────
  initFlashSale() {
    // 设置结束时间为当天 24:00
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 0);
    this.setData({ flashSaleEnd: end.getTime() });

    const timer = setInterval(() => this.updateCountdown(), 1000);
    this.setData({ flashSaleTimer: timer });
    this.updateCountdown();
  },

  updateCountdown() {
    const diff = this.data.flashSaleEnd - Date.now();
    if (diff <= 0) {
      this.setData({
        countdown: { hours: '00', minutes: '00', seconds: '00' },
      });
      clearInterval(this.data.flashSaleTimer);
      return;
    }
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    this.setData({
      countdown: {
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      },
    });
  },

  // ── 下拉刷新 ─────────────────────────────────────────
  async onPullDownRefresh() {
    this.setData({ refreshing: true });
    try {
      await this.loadData();
    } catch (err) {
      console.error(err);
    } finally {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }
  },

  // ── 上拉加载更多 ─────────────────────────────────────
  async onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true });
    const nextPage = this.data.page + 1;
    try {
      await this.loadHotProductsPage(nextPage);
      this.setData({ page: nextPage });
    } catch (err) {
      console.error('加载更多失败:', err);
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  // ── 跳转搜索 ─────────────────────────────────────────
  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  // ── 图片加载失败兜底（强制换成本地占位图） ───────────
  onProductImageError(e) {
    const idx = e.currentTarget.dataset.index;
    const key = `hotProducts[${idx}].images[0]`;
    this.setData({ [key]: '/assets/product-placeholder.png' });
  },

  // ── 商品图片本地化（Unsplash 在国内加载不了） ─────────
  _sanitizeProduct(p) {
    const placeholder = '/assets/product-placeholder.png';
    if (p.images && p.images.length > 0) {
      p.images = p.images.map(url =>
        (url && url.indexOf('unsplash.com') !== -1) ? placeholder : url
      );
    } else {
      p.images = [placeholder];
    }
    if (!p.image || p.image.indexOf('unsplash.com') !== -1) {
      p.image = placeholder;
    }
    return p;
  },

  // ── 扫码 ─────────────────────────────────────────────
  async onScanTap() {
    try {
      const res = await wx.scanCode({ scanType: ['qrCode', 'barCode'] });
      // 处理扫码结果（跳转商品或活动）
      console.log('扫码结果:', res.result);
    } catch (err) {
      // 用户取消扫码
    }
  },

  // ── 点击品类 ─────────────────────────────────────────
  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset;
    // category is not a tab bar page — use navigateTo
    app.globalData.selectedCategoryId = id;
    wx.navigateTo({
      url: '/pages/category/category',
    });
  },

  // ── Banner 轮播切换 ──────────────────────────────────
  onBannerChange(e) {
    this.setData({ bannerCurrent: e.detail.current });
  },

  // ── 点击 Banner ──────────────────────────────────────
  onBannerTap(e) {
    const { id } = e.currentTarget.dataset;
    const banner = this.data.banners.find((b) => b.id === id);
    if (banner && banner.link) {
      wx.navigateTo({ url: banner.link });
    }
  },

  // ── 点击商品 ─────────────────────────────────────────
  onProductTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/product/product?id=${id}` });
  },

  // ── 点击限时抢购商品 ─────────────────────────────────
  onFlashSaleTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/product/product?id=${id}` });
  },

  // ── 跳转购物车 ───────────────────────────────────────
  onCartTap() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  // ── 分享 ─────────────────────────────────────────────
  onShareAppMessage() {
    return {
      title: 'Cure 治愈优选 — 治愈你的日常好物',
      path: '/pages/index/index',
      imageUrl: this.data.banners[0]?.image || '',
    };
  },

  onShareTimeline() {
    return {
      title: 'Cure 治愈优选 — 治愈你的日常好物',
    };
  },
});
