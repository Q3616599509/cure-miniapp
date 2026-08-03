// pages/address-edit/address-edit.js — Address Edit Form
const app = getApp();
const { isValidPhone, showToast } = require('../../utils/util');

Page({
  data: {
    isEdit: false,
    addressId: null,
    form: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      is_default: false,
      latitude: null,
      longitude: null,
    },
    regionPickerVisible: false,
    regionText: '',
    saving: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        isEdit: true,
        addressId: options.id,
      });
      this.loadAddress(options.id);
    }
  },

  async loadAddress(id) {
    try {
      wx.showLoading({ title: '加载中...' });
      const res = await app.request({ url: '/addresses' });
      wx.hideLoading();
      if (res.code === 200) {
        const addr = (res.data || []).find(a => String(a.id) === String(id));
        if (addr) {
          this.setData({
            form: {
              name: addr.name,
              phone: addr.phone,
              province: addr.province,
              city: addr.city,
              district: addr.district,
              detail: addr.detail,
              is_default: addr.is_default === 1,
            },
            regionText: `${addr.province} ${addr.city} ${addr.district}`,
          });
        }
      }
    } catch (err) {
      wx.hideLoading();
      showToast('地址加载失败');
    }
  },

  // ── Form Inputs ──
  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ 'form.phone': e.detail.value });
  },

  onDetailInput(e) {
    this.setData({ 'form.detail': e.detail.value });
  },

  onDefaultChange(e) {
    this.setData({ 'form.is_default': e.detail.value });
  },

  // ── Region Picker ──
  onRegionChange(e) {
    const value = e.detail.value;
    const province = value[0] || '';
    const city = value[1] || '';
    const district = value[2] || '';
    this.setData({
      'form.province': province,
      'form.city': city,
      'form.district': district,
      regionText: `${province} ${city} ${district}`,
    });
  },

  // ── Map Picker ──
  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        // res: { name, address, latitude, longitude }
        // Merge map-provided address into form
        const updates = {};
        if (res.name) {
          // If detail is empty, pre-fill with the POI name
          updates['form.detail'] = res.name;
        }
        if (res.address) {
          // Append full address info
          const detail = res.name
            ? `${res.name}（${res.address}）`
            : res.address;
          updates['form.detail'] = detail;
        }
        // Store coordinates as hidden fields for server
        updates['form.latitude'] = res.latitude;
        updates['form.longitude'] = res.longitude;

        this.setData(updates);
        showToast('地址已选择', 'success');
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) {
          // User cancelled — no action needed
          return;
        }
        showToast('地图选点失败，请授权位置权限');
      },
    });
  },
  validate() {
    const { name, phone, province, city, detail } = this.data.form;

    if (!name.trim()) {
      showToast('请输入收件人姓名');
      return false;
    }
    if (!phone.trim()) {
      showToast('请输入手机号');
      return false;
    }
    if (!isValidPhone(phone)) {
      showToast('请输入正确的手机号');
      return false;
    }
    if (!province || !city) {
      showToast('请选择所在地区');
      return false;
    }
    if (!detail.trim()) {
      showToast('请输入详细地址');
      return false;
    }
    return true;
  },

  // ── Save ──
  async onSave() {
    if (!this.validate()) return;
    if (this.data.saving) return;

    this.setData({ saving: true });
    try {
      wx.showLoading({ title: '保存中...' });
      const { form, addressId, isEdit } = this.data;
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        province: form.province,
        city: form.city,
        district: form.district,
        detail: form.detail.trim(),
        is_default: form.is_default,
      };

      let res;
      if (isEdit) {
        res = await app.request({ url: `/addresses/${addressId}`, method: 'PUT', data: payload });
      } else {
        res = await app.request({ url: '/addresses', method: 'POST', data: payload });
      }

      wx.hideLoading();
      if (res.code === 200) {
        showToast('保存成功', 'success');
        setTimeout(() => wx.navigateBack(), 500);
      } else {
        showToast(res.message || '保存失败');
      }
    } catch (err) {
      wx.hideLoading();
      showToast(err.message || '保存失败');
    } finally {
      this.setData({ saving: false });
    }
  },
});
