// pages/category/category.js — 分类页
const app = getApp();
const { sanitizeProducts } = require('../../utils/image.js');

Page({
  data: {
    // 分类列表
    categories: [],
    activeIndex: 0,
    activeCategory: null,

    // 子分类
    subCategories: [],

    // 商品列表
    products: [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    loadingMore: false,

    // 排序
    sortOptions: [
      { label: '综合', value: 'default' },
      { label: '销量', value: 'sales' },
      { label: '价格', value: 'price_asc', isPrice: true },
      { label: '最新', value: 'newest' },
    ],
    sortIndex: 0,
    sortValue: 'default',
    priceSortAsc: true, // 价格排序方向

    // 状态
    loading: true,
    cartCount: 0,
  },

  onLoad() {
    this.loadCategories();

    // 如果从首页跳转，读取选中的分类
    if (app.globalData.selectedCategoryId) {
      this._pendingCategoryId = app.globalData.selectedCategoryId;
      app.globalData.selectedCategoryId = null;
    }
  },

  onShow() {
    this.setData({ cartCount: app.globalData.cartCount });
  },

  // ── 加载分类树 ───────────────────────────────────────
  async loadCategories() {
    try {
      const res = await app.request({
        url: '/products/categories/tree',
      });
      if (res.code === 200 && res.data.length) {
        const categories = res.data;

        // 如果有从首页传来的分类 ID，选中它
        let activeIndex = 0;
        if (this._pendingCategoryId) {
          const idx = categories.findIndex((c) => c.id === this._pendingCategoryId);
          if (idx >= 0) activeIndex = idx;
        }

        this.setData({
          categories,
          activeIndex,
          activeCategory: categories[activeIndex],
          subCategories: categories[activeIndex]?.children || [],
        });

        this.loadProducts(true);
      }
    } catch (err) {
      console.error('加载分类失败:', err);
      wx.showToast({ title: '加载分类失败', icon: 'none' });
    }
  },

  // ── 切换分类 ─────────────────────────────────────────
  onCategoryTap(e) {
    const { index } = e.currentTarget.dataset;
    if (index === this.data.activeIndex) return;

    this.setData({
      activeIndex: index,
      activeCategory: this.data.categories[index],
      subCategories: this.data.categories[index]?.children || [],
      products: [],
      sortIndex: 0,
      sortValue: 'default',
      priceSortAsc: true,
    });

    this.loadProducts(true);
  },

  // ── 点击子分类 ───────────────────────────────────────
  onSubCategoryTap(e) {
    const { id } = e.currentTarget.dataset;
    // 用子分类 ID 加载商品
    this.setData({ _subCategoryId: id, products: [] });
    this.loadProducts(true, id);
  },

  // ── 加载商品 ─────────────────────────────────────────
  async loadProducts(reset = false, subCategoryId = null) {
    if (reset) {
      this.setData({ page: 1, hasMore: true });
    }

    const category = this.data.activeCategory;
    if (!category) return;

    const data = {
      category_id: subCategoryId || category.id,
      sort: this.data.sortValue,
      page: this.data.page,
      page_size: this.data.pageSize,
    };

    this.setData({ loading: reset });

    try {
      const res = await app.request({ url: '/products', data });
      if (res.code === 200) {
        const list = sanitizeProducts(res.data.list || []);
        const products = reset ? list : [...this.data.products, ...list];
        this.setData({
          products,
          total: res.data.total,
          hasMore: products.length < res.data.total,
          loading: false,
          loadingMore: false,
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('加载商品失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // ── 排序切换 ─────────────────────────────────────────
  onSortTap(e) {
    const { index } = e.currentTarget.dataset;
    const option = this.data.sortOptions[index];

    // 价格排序：点击切换升序/降序
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

  // ── 跳转搜索 ─────────────────────────────────────────
  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  // ── 跳转购物车 ───────────────────────────────────────
  onCartTap() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },
});
