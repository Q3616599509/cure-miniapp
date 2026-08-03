// pages/order-now/order-now.js — Online Ordering (Luckin Coffee style)
const app = getApp();
const { formatPrice, formatSales, showToast } = require('../../utils/util');
const { sanitizeUrl } = require('../../utils/image.js');

Page({
  data: {
    // Store
    currentStore: null,

    // Categories & Products
    categories: [],
    activeCategory: 0,
    products: [],
    loadingProducts: false,

    // Spec popup
    specPopupVisible: false,
    specProduct: null,
    specSelections: {},
    specQuantity: 1,

    // Cart
    cartPopupVisible: false,
    cartItems: [],
    cartCount: 0,
    cartTotal: '0.00',

    // UI
    statusBarHeight: 20,
    scrollIntoView: '',
  },

  onLoad() {
    const sysInfo = app.globalData.systemInfo || {};
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 });
    this.initData();
  },

  onShow() {
    this.refreshCart();
    // Re-check current store in case it was changed on store page
    const store = app.globalData.currentStore;
    if (store && (!this.data.currentStore || store.id !== this.data.currentStore.id)) {
      this.setData({ currentStore: store });
    }
  },

  async initData() {
    await this.loadCategories();
    if (this.data.categories.length > 0) {
      await this.loadProducts(this.data.categories[0].id);
    }
    this.refreshCart();
  },

  // ── Categories ──
  async loadCategories() {
    try {
      const res = await app.request({ url: '/products/categories/tree' });
      if (res.code === 200) {
        // Flatten category tree: take parents, skip empty children branches
        const categories = [];
        (res.data || []).forEach(parent => {
          if (parent.children && parent.children.length > 0) {
            categories.push(...parent.children);
          } else {
            categories.push(parent);
          }
        });
        // Fallback: use hardcoded categories if API returns empty
        this.setData({
          categories: categories.length > 0 ? categories : [
            { id: 1, name: '咖啡茶饮' },
            { id: 2, name: '食品零食' },
            { id: 3, name: '家居日用' },
            { id: 4, name: '数码配件' },
            { id: 5, name: '美妆个护' },
            { id: 6, name: '服饰鞋包' },
            { id: 7, name: '图书文具' },
          ],
        });
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Fallback to hardcoded categories
      this.setData({ categories: [
        { id: 1, name: '咖啡茶饮' }, { id: 2, name: '食品零食' },
        { id: 3, name: '家居日用' }, { id: 4, name: '数码配件' },
        { id: 5, name: '美妆个护' }, { id: 6, name: '服饰鞋包' },
        { id: 7, name: '图书文具' },
      ]});
    }
  },

  onCategoryTap(e) {
    const { id, index } = e.currentTarget.dataset;
    this.setData({ activeCategory: index });
    this.loadProducts(id);
  },

  // ── Products ──
  async loadProducts(categoryId) {
    this.setData({ loadingProducts: true });
    try {
      const res = await app.request({
        url: '/products',
        data: { fulfillment: 'pickup', category_id: categoryId, page_size: 50 },
      });
      if (res.code === 200) {
        const products = (res.data.list || []).map(p => ({
          ...p,
          displayPrice: formatPrice(p.sale_price || p.price),
          originalPrice: p.price > (p.sale_price || p.price) ? formatPrice(p.price) : '',
          salesText: formatSales(p.sales) + '人购买',
          image: sanitizeUrl((p.images && p.images[0]) || ''),
          tags: p.tags || [],
        }));
        this.setData({ products });
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      showToast('商品加载失败');
    } finally {
      this.setData({ loadingProducts: false });
    }
  },

  // ── Spec Selection ──
  onProductTap(e) {
    const { productId } = e.currentTarget.dataset;
    const product = this.data.products.find(p => String(p.id) === String(productId));
    if (!product) return;
    this.openSpecPopup(product);
  },

  // ── Add Button (larger touch target, separate handler) ──
  onAddBtnTap(e) {
    const { productId } = e.currentTarget.dataset;
    const product = this.data.products.find(p => String(p.id) === String(productId));
    if (!product) {
      wx.showToast({ title: '商品不存在', icon: 'none' });
      return;
    }
    this.openSpecPopup(product);
  },

  openSpecPopup(product) {
    // Defensive: backend list endpoint should return array, but guard against string
    const rawSpecs = product.specs || [];
    const specs = Array.isArray(rawSpecs) ? rawSpecs : (typeof rawSpecs === 'string' ? JSON.parse(rawSpecs || '[]') : []);
    // Initialize spec selections with first value of each spec
    const specSelections = {};
    specs.forEach(spec => {
      if (spec.values && spec.values.length > 0) {
        specSelections[spec.name] = spec.values[0];
      }
    });
    this.setData({
      specPopupVisible: true,
      specProduct: { ...product, specs },
      specSelections,
      specQuantity: 1,
    });
  },

  onSpecValueTap(e) {
    const { specName, value } = e.currentTarget.dataset;
    this.setData({ [`specSelections.${specName}`]: value });
  },

  onSpecQuantityChange(e) {
    this.setData({ specQuantity: e.detail.value });
  },

  onSpecPopupClose(e) {
    // Only close on user dismiss (visible-change fires both on open and close)
    if (e.detail && e.detail.visible === false) {
      this.setData({ specPopupVisible: false });
    }
  },

  // ── Add to Cart ──
  onAddToCart() {
    const { specProduct, specSelections, specQuantity } = this.data;
    if (!specProduct) return;

    // Build spec text
    const specParts = Object.entries(specSelections).map(([name, value]) => `${name}: ${value}`);
    const specText = specParts.join(' / ');

    // Check if same product + spec already in cart
    const cart = app.globalData.cart;
    const existingIdx = cart.findIndex(item =>
      item.productId === specProduct.id && item.specText === specText
    );

    if (existingIdx >= 0) {
      cart[existingIdx].quantity += specQuantity;
    } else {
      cart.push({
        cartId: Date.now() + Math.random(),
        productId: specProduct.id,
        name: specProduct.name,
        image: specProduct.image,
        price: Number(specProduct.sale_price || specProduct.price),
        specText,
        specs: { ...specSelections },
        quantity: specQuantity,
      });
    }

    app.globalData.cart = cart;
    app.saveCart();
    this.refreshCart();
    this.setData({ specPopupVisible: false });
    showToast('已加入购物车', 'success');
  },

  // ── Order Now (from spec popup) ──
  onOrderNow() {
    this.onAddToCart();
    this.setData({ cartPopupVisible: true });
  },

  // ── Cart ──
  refreshCart() {
    const cart = app.globalData.cart || [];
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    this.setData({
      cartItems: cart,
      cartCount,
      cartTotal: formatPrice(cartTotal),
    });
  },

  onCartBarTap() {
    if (this.data.cartCount === 0) return;
    this.setData({ cartPopupVisible: true });
  },

  onCartPopupClose(e) {
    // Only close on user dismiss (visible-change fires both on open and close)
    if (e.detail && e.detail.visible === false) {
      this.setData({ cartPopupVisible: false });
    }
  },

  onCartItemQtyChange(e) {
    const { index } = e.currentTarget.dataset;
    const { value } = e.detail;
    const cart = app.globalData.cart;
    if (value <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = value;
    }
    app.globalData.cart = cart;
    app.saveCart();
    this.refreshCart();
  },

  onClearCart() {
    wx.showModal({
      title: '提示',
      content: '确定清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.cart = [];
          app.saveCart();
          this.refreshCart();
          this.setData({ cartPopupVisible: false });
        }
      },
    });
  },

  // ── Checkout ──
  onCheckout() {
    if (this.data.cartCount === 0) return;
    if (!app.globalData.currentStore) {
      wx.showModal({
        title: '请选择门店',
        content: '请先选择取餐门店',
        confirmText: '去选择',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/store/store' });
        },
      });
      return;
    }
    if (!app.isLoggedIn()) {
      wx.showModal({
        title: '请先登录',
        content: '下单需要先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) wx.switchTab({ url: '/pages/user/user' });
        },
      });
      return;
    }
    wx.navigateTo({ url: '/pages/checkout/checkout' });
  },

  // ── Store Selector ──
  onStoreTap() {
    wx.navigateTo({ url: '/pages/store/store' });
  },
});
