// pages/address/address.js — Address List
const app = getApp();
const { showToast, showModal } = require('../../utils/util');

Page({
  data: {
    addresses: [],
    loading: true,
    selectMode: false,
    maxAddresses: 20,
    addButtonText: '新增地址',
  },

  onLoad(options) {
    if (options.from === 'checkout') {
      this.setData({ selectMode: true });
    }
  },

  onShow() {
    this.loadAddresses();
  },

  async loadAddresses() {
    if (!app.isLoggedIn()) {
      this.setData({ loading: false });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await app.request({ url: '/addresses' });
      res.data.forEach(item => {
        item.swipeActions = [
          { text: '编辑', className: 'swipe-edit' },
          { text: '删除', className: 'swipe-delete' }
        ];
      });
      if (res.code === 200) {
        const addresses = (res.data || []).map(a => ({
          ...a,
          fullAddress: `${a.province}${a.city}${a.district}${a.detail}`,
          isDefault: a.is_default === 1,
        }));
        const addButtonText = addresses.length >= 15
          ? `新增地址 (${addresses.length}/${this.data.maxAddresses})`
          : '新增地址';
        this.setData({ addresses, addButtonText, loading: false });
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
      if (err.code !== 401) {
        showToast('地址加载失败');
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  // ── Select address (for checkout) ──
  onAddressTap(e) {
    if (this.data.selectMode) {
      const address = e.currentTarget.dataset.address;
      // Get previous page and pass selected address
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage) {
        prevPage.setData({ selectedAddress: address });
      }
      wx.navigateBack();
    }
  },

  // ── Edit ──
  onEditTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/address-edit/address-edit?id=${id}` });
  },

  // ── Delete ──
  async onDeleteTap(e) {
    const id = e.currentTarget.dataset.id;
    const res = await showModal({
      title: '提示',
      content: '确定删除该地址吗？',
    });
    if (!res.confirm) return;

    try {
      wx.showLoading({ title: '删除中...' });
      const result = await app.request({ url: `/addresses/${id}`, method: 'DELETE' });
      wx.hideLoading();
      if (result.code === 200) {
        showToast('已删除', 'success');
        this.loadAddresses();
      }
    } catch (err) {
      wx.hideLoading();
      showToast(err.message || '删除失败');
    }
  },

  // ── Set default ──
  async onSetDefault(e) {
    const id = e.currentTarget.dataset.id;
    try {
      wx.showLoading({ title: '设置中...' });
      const res = await app.request({ url: `/addresses/${id}/default`, method: 'PUT' });
      wx.hideLoading();
      if (res.code === 200) {
        showToast('已设为默认', 'success');
        this.loadAddresses();
      }
    } catch (err) {
      wx.hideLoading();
      showToast(err.message || '设置失败');
    }
  },

  // ── Add new address ──
  onAddTap() {
    if (this.data.addresses.length >= this.data.maxAddresses) {
      showToast(`最多添加${this.data.maxAddresses}个地址`);
      return;
    }
    wx.navigateTo({ url: '/pages/address-edit/address-edit' });
  },

  // ── Import from WeChat address ──
  onImportWeChat() {
    wx.chooseAddress({
      success: async (res) => {
        console.log('WeChat address:', res);
        try {
          wx.showLoading({ title: '导入中...' });
          const result = await app.request({
            url: '/addresses',
            method: 'POST',
            data: {
              name: res.userName,
              phone: res.telNumber,
              province: res.provinceName,
              city: res.cityName,
              district: res.countyName,
              detail: res.detailInfo,
              is_default: 0,
            },
          });
          wx.hideLoading();
          if (result.code === 200) {
            showToast('导入成功', 'success');
            this.loadAddresses();
          }
        } catch (err) {
          wx.hideLoading();
          showToast(err.message || '导入失败');
        }
      },
      fail: (err) => {
        if (!err.errMsg.includes('cancel')) {
          console.error('chooseAddress failed:', err);
        }
      },
    });
  },

  // ── Swipe actions ──
  onSwipeAction(e) {
    const { type, id } = e.currentTarget.dataset;
    if (type === 'edit') {
      this.onEditTap({ currentTarget: { dataset: { id } } });
    } else if (type === 'delete') {
      this.onDeleteTap({ currentTarget: { dataset: { id } } });
    }
  },
});
