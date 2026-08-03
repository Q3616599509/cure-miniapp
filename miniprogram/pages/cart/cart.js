// pages/cart/cart.js — 购物车页
const app = getApp();
const { sanitizeProduct } = require('../../utils/image.js');

Page({
  data: {
    cartItems: [],
    loading: true,
    isEdit: false,
    selectedIds: [],
    allSelected: false,
    totalPrice: 0,
    totalCount: 0,
    selectedCount: 0,
    swipeRightActions: [{ text: '删除', className: 'swipe-delete-btn' }],
  },

  onLoad() {
    this.loadCart();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadCart();
    }
  },

  async onPullDownRefresh() {
    await this.loadCart();
    wx.stopPullDownRefresh();
  },

  // ── 加载购物车 ───────────────────────────────────────
  async loadCart() {
    try {
      const res = await app.request({ url: '/cart' });
      if (res.code === 200) {
        const items = (res.data.items || []).map((item) => {
          const sanitized = sanitizeProduct(item);
          return {
            ...sanitized,
            checked: false, // 初始化为未选中
          };
        });
        this.setData({
          cartItems: items,
          loading: false,
          totalCount: res.data.totalCount || 0,
        });
        this.updateTotal();
        // 更新全局购物车数量
        app.globalData.cartCount = res.data.totalCount || 0;
      }
    } catch (err) {
      console.error('加载购物车失败:', err);
      this.setData({ loading: false });
    }
  },

  // ── 切换单个商品选中 ─────────────────────────────────
  onItemToggle(e) {
    const { id } = e.currentTarget.dataset;
    const items = this.data.cartItems.map((item) => {
      if (item.id === id) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });
    this.setData({ cartItems: items });
    this.updateTotal();
  },

  // ── 全选/取消全选 ─────────────────────────────────────
  onToggleAll() {
    const newChecked = !this.data.allSelected;
    const items = this.data.cartItems.map((item) => ({
      ...item,
      checked: newChecked,
    }));
    this.setData({ cartItems: items, allSelected: newChecked });
    this.updateTotal();
  },

  // ── 计算总价和选中数量 ────────────────────────────────
  updateTotal() {
    let totalPrice = 0;
    let selectedCount = 0;
    let selectedIds = [];

    this.data.cartItems.forEach((item) => {
      if (item.checked) {
        const price = item.sale_price || 0;
        totalPrice += price * item.quantity;
        selectedCount += 1;
        selectedIds.push(item.id);
      }
    });

    const allSelected = this.data.cartItems.length > 0 &&
      this.data.cartItems.every((item) => item.checked);

    this.setData({
      totalPrice: totalPrice.toFixed(2),
      selectedCount,
      selectedIds,
      allSelected,
    });
  },

  // ── 修改数量 ─────────────────────────────────────────
  async onQuantityChange(e) {
    const { id } = e.currentTarget.dataset;
    const { value } = e.detail;
    const quantity = Math.max(1, value);

    // 先更新 UI
    const items = this.data.cartItems.map((item) =>
      item.id === id ? { ...item, quantity } : item
    );
    this.setData({ cartItems: items });
    this.updateTotal();

    // 同步到服务器
    try {
      await app.request({
        url: `/cart/${id}`,
        method: 'PUT',
        data: { quantity },
      });
      app.getCartCount();
    } catch (err) {
      console.error('更新数量失败:', err);
      this.loadCart(); // 失败后重新加载
    }
  },

  // ── 删除商品 ─────────────────────────────────────────
  async onDeleteItem(e) {
    const { id } = e.currentTarget.dataset;
    try {
      const res = await app.request({
        url: `/cart/${id}`,
        method: 'DELETE',
      });
      if (res.code === 200) {
        wx.showToast({ title: '已删除', icon: 'none' });
        this.loadCart();
      }
    } catch (err) {
      console.error('删除失败:', err);
    }
  },

  // ── 批量删除 ─────────────────────────────────────────
  async onBatchDelete() {
    if (this.data.selectedIds.length === 0) {
      wx.showToast({ title: '请选择要删除的商品', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '提示',
      content: `删除选中的${this.data.selectedIds.length}件商品？`,
      success: async (res) => {
        if (res.confirm) {
          // 逐个删除
          wx.showLoading({ title: '删除中...', mask: true });
          for (const id of this.data.selectedIds) {
            try {
              await app.request({
                url: `/cart/${id}`,
                method: 'DELETE',
              });
            } catch (err) {
              console.error('删除失败:', err);
            }
          }
          wx.hideLoading();
          this.loadCart();
        }
      },
    });
  },

  // ── 清空购物车 ───────────────────────────────────────
  async onClearCart() {
    wx.showModal({
      title: '提示',
      content: '确定清空购物车吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({ url: '/cart', method: 'DELETE' });
            wx.showToast({ title: '已清空', icon: 'none' });
            this.loadCart();
          } catch (err) {
            console.error('清空失败:', err);
          }
        }
      },
    });
  },

  // ── 切换编辑模式 ─────────────────────────────────────
  onToggleEdit() {
    this.setData({ isEdit: !this.data.isEdit });
  },

  // ── 去结算 ───────────────────────────────────────────
  onCheckout() {
    if (this.data.selectedIds.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    // 获取选中的商品
    const selectedItems = this.data.cartItems.filter((item) =>
      this.data.selectedIds.includes(item.id)
    );

    // 存入全局，跳转结算页
    app.globalData.checkoutItems = selectedItems.map((item) => ({
      product_id: item.product_id,
      sku_id: item.sku_id,
      product_name: item.product_name,
      spec_text: item.sku_id ? '' : '',
      image: item.product_images?.[0] || '',
      price: item.sale_price,
      quantity: item.quantity,
      subtotal: (item.sale_price * item.quantity).toFixed(2),
    }));

    wx.navigateTo({ url: '/pages/checkout/checkout?from=cart' });
  },

  // ── 点击商品 ─────────────────────────────────────────
  onProductTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/product/product?id=${id}` });
  },

  // ── 去逛逛 ───────────────────────────────────────────
  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
