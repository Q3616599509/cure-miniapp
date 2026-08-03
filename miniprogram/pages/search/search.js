// pages/search/search.js — 搜索页
const app = getApp();
const { sanitizeProducts } = require('../../utils/image.js');

Page({
  data: {
    keyword: '',
    searchHistory: [],
    hotKeywords: [
      '咖啡', '坚果', '面膜', '数据线', 'T恤',
      '三体', '口红', '充电宝', '抱枕', '耳机',
    ],

    // 搜索结果
    products: [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    loadingMore: false,
    hasSearched: false,

    // 排序
    sortOptions: [
      { label: '综合', value: 'default' },
      { label: '销量', value: 'sales' },
      { label: '价格', value: 'price_asc', isPrice: true },
      { label: '最新', value: 'newest' },
    ],
    sortIndex: 0,
    sortValue: 'default',
    priceSortAsc: true,

    // 状态
    loading: false,
    focusInput: true,

    // 导航栏高度
    statusBarHeight: 20,
    navBarHeight: 108,
  },

  onLoad() {
    const sysInfo = app.globalData.systemInfo || wx.getSystemInfoSync();
    const statusBarHeight = sysInfo.statusBarHeight || 20;
    const navBarHeight = statusBarHeight + 44;
    this.setData({ statusBarHeight, navBarHeight });
    this.loadSearchHistory();
  },

  // ── 加载搜索历史 ─────────────────────────────────────
  loadSearchHistory() {
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ searchHistory: history });
  },

  // ── 保存搜索历史 ─────────────────────────────────────
  saveSearchHistory(keyword) {
    if (!keyword.trim()) return;
    let history = wx.getStorageSync('searchHistory') || [];
    // 去重
    history = history.filter((item) => item !== keyword);
    // 添加到头部
    history.unshift(keyword);
    // 最多保存 15 条
    history = history.slice(0, 15);
    wx.setStorageSync('searchHistory', history);
    this.setData({ searchHistory: history });
  },

  // ── 输入关键词 ───────────────────────────────────────
  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // ── 清空输入 ─────────────────────────────────────────
  onClear() {
    this.setData({
      keyword: '',
      products: [],
      hasSearched: false,
      focusInput: true,
    });
  },

  // ── 执行搜索 ─────────────────────────────────────────
  onSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' });
      return;
    }

    this.saveSearchHistory(keyword);
    this.setData({
      hasSearched: true,
      sortIndex: 0,
      sortValue: 'default',
      priceSortAsc: true,
    });
    this.loadProducts(true);
  },

  // ── 点击历史/热搜关键词 ──────────────────────────────
  onKeywordTap(e) {
    const { keyword } = e.currentTarget.dataset;
    this.setData({ keyword });
    this.onSearch();
  },

  // ── 清空搜索历史 ─────────────────────────────────────
  onClearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory');
          this.setData({ searchHistory: [] });
        }
      },
    });
  },

  // ── 加载商品 ─────────────────────────────────────────
  async loadProducts(reset = false) {
    if (reset) {
      this.setData({ page: 1, hasMore: true });
    }

    this.setData({ loading: reset });

    try {
      const res = await app.request({
        url: '/products',
        data: {
          keyword: this.data.keyword,
          sort: this.data.sortValue,
          page: this.data.page,
          page_size: this.data.pageSize,
        },
      });

      if (res.code === 200) {
        const list = sanitizeProducts(res.data.list || []);
        // 高亮关键词
        const products = list.map((p) => ({
          ...p,
          highlightName: this.highlightKeyword(p.name, this.data.keyword),
        }));
        const allProducts = reset ? products : [...this.data.products, ...products];
        this.setData({
          products: allProducts,
          total: res.data.total,
          hasMore: allProducts.length < res.data.total,
          loading: false,
          loadingMore: false,
        });
      } else {
        this.setData({ loading: false, products: [] });
      }
    } catch (err) {
      console.error('搜索失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '搜索失败', icon: 'none' });
    }
  },

  // ── 关键词高亮 ───────────────────────────────────────
  highlightKeyword(name, keyword) {
    if (!keyword) return [{ text: name, highlight: false }];
    const parts = [];
    const reg = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const segments = name.split(reg);
    for (const seg of segments) {
      if (!seg) continue;
      parts.push({
        text: seg,
        highlight: seg.toLowerCase() === keyword.toLowerCase(),
      });
    }
    return parts;
  },

  // ── 排序切换 ─────────────────────────────────────────
  onSortTap(e) {
    const { index } = e.currentTarget.dataset;
    const option = this.data.sortOptions[index];

    if (option.isPrice) {
      const isAsc = index === this.data.sortIndex ? !this.data.priceSortAsc : true;
      this.setData({
        sortIndex: index,
        sortValue: isAsc ? 'price_asc' : 'price_desc',
        priceSortAsc: isAsc,
      });
    } else {
      this.setData({
        sortIndex: index,
        sortValue: option.value,
        priceSortAsc: true,
      });
    }

    this.loadProducts(true);
  },

  // ── 上拉加载更多 ─────────────────────────────────────
  async onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore || this.data.loading) return;
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    await this.loadProducts(false);
  },

  // ── 点击商品 ─────────────────────────────────────────
  onProductTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/product/product?id=${id}` });
  },

  // ── 返回 ─────────────────────────────────────────────
  onBack() {
    wx.navigateBack({ delta: 1 });
  },
});
