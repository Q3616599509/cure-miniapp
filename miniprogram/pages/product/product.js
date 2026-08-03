// pages/product/product.js — 商品详情页
const app = getApp();

Page({
  data: {
    productId: null,
    product: null,
    loading: true,

    // 图片轮播
    swiperCurrent: 0,

    // SKU 选择
    showSkuPopup: false,
    skuMode: '', // 'cart' | 'buy'
    selectedSpecs: {}, // { 温度: '热', 杯型: '大杯' }
    selectedSku: null,
    selectedSkuText: '',
    showOriginalPrice: false,
    quantity: 1,

    // 收藏
    isFavorited: false,

    // 购物车
    cartCount: 0,
  },

  onLoad(options) {
    this.setData({ productId: options.id });
    this.loadProduct();
  },

  onShow() {
    this.setData({ cartCount: app.globalData.cartCount });
  },

  // ── 加载商品详情 ─────────────────────────────────────
  async loadProduct() {
    try {
      const res = await app.request({
        url: `/products/${this.data.productId}`,
      });
      if (res.code === 200) {
        const product = res.data;
        // 本地化图片：Unsplash 在国内加载不了，换成本地占位图
        const placeholder = '/assets/product-placeholder.png';
        if (product.images && product.images.length > 0) {
          product.images = product.images.map(url =>
            (url && url.indexOf('unsplash.com') !== -1) ? placeholder : url
          );
        } else {
          product.images = [placeholder];
        }
        // 初始化默认规格选择
        const selectedSpecs = {};
        if (product.specs && product.specs.length) {
          product.specs.forEach((spec) => {
            selectedSpecs[spec.name] = spec.values[0];
          });
        }
        // 匹配默认 SKU
        const selectedSku = this.matchSku(product.skus, selectedSpecs);
        const selectedSkuText = selectedSku
          ? selectedSku.spec_values.map((sv) => sv.value).join(' / ')
          : '请选择规格';
        const currentPrice = selectedSku && selectedSku.price ? selectedSku.price : product.sale_price;
        const showOriginalPrice = product.price > currentPrice;

        this.setData({
          product,
          selectedSpecs,
          selectedSku,
          selectedSkuText,
          showOriginalPrice,
          isFavorited: product.is_favorited || false,
          loading: false,
        });
      } else {
        wx.showToast({ title: res.message || '商品不存在', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('加载商品详情失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // ── 图片轮播切换 ─────────────────────────────────────
  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current });
  },

  // ── 预览大图 ─────────────────────────────────────────
  onPreviewImage(e) {
    const { current } = e.currentTarget.dataset;
    const urls = this.data.product.images || [];
    wx.previewImage({ current, urls });
  },

  // ── 打开 SKU 弹窗 ────────────────────────────────────
  openSkuPopup(e) {
    if (!app.checkLogin()) return;
    const mode = e.currentTarget.dataset.mode || 'cart';
    this.setData({ showSkuPopup: true, skuMode: mode });
  },

  // ── 关闭 SKU 弹窗 ────────────────────────────────────
  closeSkuPopup() {
    this.setData({ showSkuPopup: false });
  },

  // ── 选择规格 ─────────────────────────────────────────
  onSpecSelect(e) {
    const { specName, value } = e.currentTarget.dataset;
    const selectedSpecs = { ...this.data.selectedSpecs, [specName]: value };
    const selectedSku = this.matchSku(this.data.product.skus, selectedSpecs);
    const selectedSkuText = selectedSku
      ? selectedSku.spec_values.map((sv) => sv.value).join(' / ')
      : '请选择规格';
    const product = this.data.product;
    const currentPrice = selectedSku && selectedSku.price ? selectedSku.price : product.sale_price;
    const showOriginalPrice = product.price > currentPrice;
    this.setData({ selectedSpecs, selectedSku, selectedSkuText, showOriginalPrice });
  },

  // ── 匹配 SKU ─────────────────────────────────────────
  matchSku(skus, selectedSpecs) {
    if (!skus || !skus.length) return null;
    return skus.find((sku) => {
      return sku.spec_values.every((sv) => selectedSpecs[sv.name] === sv.value);
    });
  },

  // ── 数量变更 ─────────────────────────────────────────
  onQuantityChange(e) {
    this.setData({ quantity: e.detail.value });
  },

  // ── 确认加入购物车/购买 ──────────────────────────────
  async onSkuConfirm() {
    const { skuMode, selectedSku, quantity, product } = this.data;

    if (product.specs && product.specs.length && !selectedSku) {
      wx.showToast({ title: '请选择完整规格', icon: 'none' });
      return;
    }

    const stock = selectedSku ? selectedSku.stock : product.stock;
    if (quantity > stock) {
      wx.showToast({ title: `库存仅剩${stock}件`, icon: 'none' });
      return;
    }

    if (skuMode === 'cart') {
      await this.addToCart();
    } else if (skuMode === 'buy') {
      this.buyNow();
    }
  },

  // ── 加入购物车 ───────────────────────────────────────
  async addToCart() {
    const { selectedSku, quantity, product } = this.data;
    try {
      const res = await app.request({
        url: '/cart',
        method: 'POST',
        data: {
          product_id: product.id,
          sku_id: selectedSku ? selectedSku.id : null,
          quantity,
        },
        showLoading: true,
        loadingText: '加入中',
      });
      if (res.code === 200) {
        wx.showToast({ title: '已加入购物车', icon: 'success' });
        app.globalData.cartCount = res.data.count;
        this.setData({
          showSkuPopup: false,
          cartCount: res.data.count,
        });
      }
    } catch (err) {
      console.error('加入购物车失败:', err);
    }
  },

  // ── 立即购买 ─────────────────────────────────────────
  buyNow() {
    const { selectedSku, quantity, product } = this.data;
    const price = selectedSku && selectedSku.price ? selectedSku.price : product.sale_price;

    // 构造结算商品
    const checkoutItem = {
      product_id: product.id,
      sku_id: selectedSku ? selectedSku.id : null,
      product_name: product.name,
      spec_text: selectedSku
        ? selectedSku.spec_values.map((sv) => `${sv.name}:${sv.value}`).join('，')
        : '',
      image: product.images[0] || '',
      price,
      quantity,
      subtotal: (price * quantity).toFixed(2),
    };

    // 存入全局，跳转结算页
    app.globalData.buyNowItem = checkoutItem;
    this.setData({ showSkuPopup: false });
    wx.navigateTo({ url: '/pages/checkout/checkout?from=buyNow' });
  },

  // ── 收藏 / 取消收藏 ───────────────────────────────────
  async onFavoriteToggle() {
    if (!app.checkLogin()) return;
    const { isFavorited, product } = this.data;
    try {
      if (isFavorited) {
        await app.request({
          url: `/favorites/${product.id}`,
          method: 'DELETE',
        });
        this.setData({ isFavorited: false });
        wx.showToast({ title: '已取消收藏', icon: 'none' });
      } else {
        await app.request({
          url: '/favorites',
          method: 'POST',
          data: { product_id: product.id },
        });
        this.setData({ isFavorited: true });
        wx.showToast({ title: '已收藏', icon: 'success' });
      }
    } catch (err) {
      console.error('收藏操作失败:', err);
    }
  },

  // ── 跳转购物车 ───────────────────────────────────────
  onCartTap() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  // ── 联系客服 ─────────────────────────────────────────
  onContactTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  // ── 分享 ─────────────────────────────────────────────
  onShareAppMessage() {
    const { product } = this.data;
    return {
      title: product ? `${product.name} ¥${product.sale_price}` : 'Cure 治愈优选',
      path: `/pages/product/product?id=${this.data.productId}`,
      imageUrl: product?.images?.[0] || '',
    };
  },

  onShareTimeline() {
    const { product } = this.data;
    return {
      title: product ? `${product.name} ¥${product.sale_price}` : 'Cure 治愈优选',
      query: `id=${this.data.productId}`,
    };
  },
});
