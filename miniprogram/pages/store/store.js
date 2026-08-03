// pages/store/store.js — 门店选择（增强定位版）
const app = getApp();
const { formatDistance, showToast } = require('../../utils/util');

Page({
  data: {
    stores: [],
    filteredStores: [],
    searchKeyword: '',
    userLat: null,
    userLng: null,
    locationAccuracy: null,   // GPS 精度（米），用于判断定位质量
    loading: true,
    locating: true,
    locationError: false,
    locationPoorAccuracy: false,  // 精度过低警告
    selectedStoreId: null,
    // 地图中心（默认深圳）
    mapCenter: { latitude: 22.5362, longitude: 113.9558 },
    mapScale: 13,
    locationInfo: '',     // 定位详情文字（坐标/精度/距离）
    farFromStores: false, // 是否离门店太远
    markers: [],
    // 排序方式
    sortBy: 'distance', // 'distance' | 'name'
  },

  onLoad() {
    this.getLocationAndLoad();
  },

  onShow() {
    // 如果之前选过门店，高亮显示
    const currentStore = app.globalData.currentStore;
    if (currentStore) {
      this.setData({ selectedStoreId: currentStore.id });
    }
  },

  // ── 获取定位并加载门店 ────────────────────────────────
  async getLocationAndLoad() {
    this.setData({ locating: true, locationError: false, locationPoorAccuracy: false });

    let lat = null, lng = null;
    try {
      const loc = await this.getLocation();
      lat = loc.latitude;
      lng = loc.longitude;
      const acc = loc.accuracy || null;
      const poorAcc = acc && acc > 100; // >100m 视为精度不足
      this.setData({
        userLat: lat, userLng: lng,
        locationAccuracy: acc,
        locationPoorAccuracy: poorAcc,
      });
    } catch (e) {
      console.log('定位失败，使用默认位置:', e.errMsg || e.message);
      this.setData({ locationError: true });

      // 尝试获取用户授权设置
      try {
        const setting = await this.getSetting();
        if (!setting.authSetting['scope.userLocation']) {
          // 引导用户开启定位
          wx.showModal({
            title: '需要位置权限',
            content: '开启定位后，可以查看附近的门店并按距离排序，获得更好的点单体验',
            confirmText: '去开启',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            },
          });
        }
      } catch (_) {}
    }

    await this.loadStores(lat, lng);
    this.setData({ locating: false });
  },

  // ── 重新定位 ──────────────────────────────────────────
  async onRelocate() {
    this.setData({ locating: true, locationError: false, locationPoorAccuracy: false });
    let lat = null, lng = null;
    try {
      const loc = await this.getLocation();
      lat = loc.latitude;
      lng = loc.longitude;
      const acc = loc.accuracy || null;
      this.setData({
        userLat: lat, userLng: lng,
        locationError: false, locationPoorAccuracy: acc > 100,
      });
    } catch (e) {
      this.setData({ locationError: true });
    }
    await this.loadStores(lat, lng);
    this.setData({ locating: false });
  },

  // ── 加载门店列表 ──────────────────────────────────────
  async loadStores(lat, lng) {
    this.setData({ loading: true });
    try {
      const params = {};
      if (lat && lng) {
        params.lat = lat;
        params.lng = lng;
      }

      const res = await app.request({ url: '/stores', data: params });
      if (res.code !== 200) throw new Error(res.message || '加载失败');

      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();

      const stores = (res.data || []).map(s => {
        const isOpen = this.checkStoreOpen(s.hours, currentMin);
        return {
          ...s,
          // ✅ 修复：distance=0 是合法值，不能用 falsy 判断
          distanceText: s.distance !== undefined ? formatDistance(s.distance) : '未知距离',
          isOpen,
          statusText: isOpen ? '营业中' : '已打烊',
          statusColor: isOpen ? '#52C41A' : '#999',
        };
      });

      // 按距离排序（默认）
      if (this.data.sortBy === 'distance') {
        stores.sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999));
      }

      // 计算最近门店距离
      const nearestDistance = stores[0]?.distance ?? Infinity;
      const farFromStores = lat && lng && nearestDistance > 50000; // >50km 算太远

      // ── 智能地图居中 ──
      // 如果用户离门店太远，不要把地图中心放在用户位置（否则看不到任何门店）
      let mapCenter, mapScale;
      if (lat && lng && !farFromStores) {
        // 用户离门店较近，以用户为中心
        mapCenter = { latitude: lat, longitude: lng };
        mapScale = this.computeMapScale(nearestDistance);
      } else if (stores.length > 0) {
        // 太远 or 无定位：以最近门店为中心，同时确保所有门店都在视野内
        mapCenter = { latitude: stores[0].latitude, longitude: stores[0].longitude };
        const farthest = Math.max(...stores.map(s => s.distance ?? 0));
        mapScale = this.computeMapScale(farthest);
      } else {
        mapCenter = this.data.mapCenter;
        mapScale = 13;
      }

      // ── 定位详情文字 ──
      const { locationAccuracy } = this.data;
      let locationInfo = '';
      if (lat && lng) {
        const coordStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        if (locationAccuracy) {
          locationInfo = `位置: ${coordStr} · 精度 ${Math.round(locationAccuracy)}m`;
        } else {
          locationInfo = `位置: ${coordStr}`;
        }
        if (!farFromStores && nearestDistance !== Infinity) {
          locationInfo += ` · 最近门店 ${stores[0].distanceText}`;
        }
      } else {
        locationInfo = '未获取到位置，显示所有门店';
      }

      // ── 构建地图标记 ──
      const markers = stores.map((s) => ({
        id: s.id,
        latitude: s.latitude,
        longitude: s.longitude,
        title: s.name,
        iconPath: '/assets/map-marker.png',
        width: 36,
        height: 36,
        callout: {
          content: `${s.name}\n${s.distanceText} · ${s.statusText}`,
          color: '#333',
          fontSize: 12,
          borderRadius: 8,
          bgColor: '#fff',
          padding: 8,
          display: 'BYCLICK',
        },
      }));

      // 添加用户位置标记（即使离很远也显示，让用户知道自己的位置）
      if (lat && lng) {
        markers.unshift({
          id: 0,
          latitude: lat,
          longitude: lng,
          title: '我的位置',
          iconPath: '/assets/location-marker.png',
          width: 20,
          height: 20,
          callout: {
            content: farFromStores
              ? `我的位置（离门店 ${stores[0].distanceText}）`
              : '我的位置',
            color: '#07C160',
            fontSize: 11,
            borderRadius: 6,
            bgColor: '#e8f8ee',
            padding: 4,
            display: 'ALWAYS',
          },
        });
      }

      this.setData({
        stores,
        filteredStores: stores,
        markers,
        mapCenter,
        mapScale,
        locationInfo,
        farFromStores,
        userLat: lat,
        userLng: lng,
      });
    } catch (err) {
      console.error('门店加载失败:', err);
      showToast('门店加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // ── 根据距离自动计算地图缩放级别 ──
  computeMapScale(nearestDistance) {
    if (nearestDistance < 500) return 16;    // <500m: 街区级
    if (nearestDistance < 1500) return 15;   // <1.5km: 街道级
    if (nearestDistance < 5000) return 14;   // <5km: 区域级
    if (nearestDistance < 20000) return 13;  // <20km: 城区级
    if (nearestDistance < 50000) return 12;  // <50km: 城市级
    return 11;                                // >=50km: 省级
  },

  // ── 获取定位（高精度版）──────────────────────────────
  getLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,           // ✅ 强制使用 GPS 高精度定位
        highAccuracyExpireTime: 5000,   // 5s 内取不到 GPS 则降级为网络定位
        success: (res) => {
          // 记录精度信息，方便排查
          console.log(`定位成功: ${res.latitude}, ${res.longitude} 精度: ${res.accuracy || '未知'}m`);
          resolve(res);
        },
        fail: (err) => {
          // 如果高精度模式超时/失败，降级重试普通定位
          if (err.errMsg && (err.errMsg.includes('timeout') || err.errMsg.includes('high accuracy'))) {
            console.log('高精度定位失败，降级为普通定位');
            wx.getLocation({
              type: 'gcj02',
              success: (res2) => resolve(res2),
              fail: (err2) => {
                if (err2.errMsg && err2.errMsg.includes('auth deny')) {
                  reject(new Error('auth_denied'));
                } else {
                  reject(err2);
                }
              },
            });
          } else if (err.errMsg && err.errMsg.includes('auth deny')) {
            reject(new Error('auth_denied'));
          } else {
            reject(err);
          }
        },
      });
    });
  },

  getSetting() {
    return new Promise((resolve) => {
      wx.getSetting({ success: resolve, fail: () => resolve({ authSetting: {} }) });
    });
  },

  // ── 判断门店是否营业 ──────────────────────────────────
  checkStoreOpen(hours, currentMin) {
    if (!hours) return true;
    // 支持 09:00-22:00 格式
    const match = hours.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
    if (!match) return true;
    const [, openH, openM, closeH, closeM] = match;
    const now = currentMin !== undefined ? currentMin : (() => {
      const d = new Date();
      return d.getHours() * 60 + d.getMinutes();
    })();
    const openMin = parseInt(openH) * 60 + parseInt(openM);
    const closeMin = parseInt(closeH) * 60 + parseInt(closeM);
    return now >= openMin && now < closeMin;
  },

  // ── 切换排序 ──────────────────────────────────────────
  onSortChange(e) {
    const sortBy = e.currentTarget.dataset.sort;
    this.setData({ sortBy });
    let stores = [...this.data.stores];
    if (sortBy === 'distance') {
      stores.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
    } else {
      stores.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    }
    this.setData({ filteredStores: stores });
  },

  // ── 搜索 ──────────────────────────────────────────────
  onSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ searchKeyword: keyword });
    this.filterStores(keyword);
  },

  onSearchClear() {
    this.setData({ searchKeyword: '' });
    this.filterStores('');
  },

  filterStores(keyword) {
    if (!keyword) {
      this.setData({ filteredStores: this.data.stores });
      return;
    }
    const lower = keyword.toLowerCase();
    const filtered = this.data.stores.filter(s =>
      s.name.includes(keyword) ||
      s.address.includes(keyword) ||
      (s.city && s.city.includes(keyword)) ||
      (s.district && s.district.includes(keyword))
    );
    this.setData({ filteredStores: filtered });
  },

  // ── 选择门店 ──────────────────────────────────────────
  onStoreTap(e) {
    const store = e.currentTarget.dataset.store;
    app.globalData.currentStore = store;
    wx.setStorageSync('currentStore', store);
    this.setData({ selectedStoreId: store.id });
    showToast('已选择' + store.name, 'success');
    setTimeout(() => {
      wx.navigateBack();
    }, 600);
  },

  // ── 打开门店导航 ──────────────────────────────────────
  onNavigateToStore(e) {
    const store = e.currentTarget.dataset.store;
    wx.openLocation({
      latitude: store.latitude,
      longitude: store.longitude,
      name: store.name,
      address: store.address,
      scale: 16,
    });
  },

  // ── 地图标记点击 ──────────────────────────────────────
  onMarkerTap(e) {
    const markerId = e.detail.markerId;
    if (markerId === 0) return; // 用户位置标记
    const store = this.data.stores.find(s => s.id === markerId);
    if (store) {
      wx.showModal({
        title: store.name,
        content: `${store.address}\n${store.distanceText} · ${store.statusText}\n营业时间: ${store.hours || '未知'}`,
        confirmText: '选择门店',
        cancelText: '查看导航',
        success: (res) => {
          if (res.confirm) {
            this.onStoreTap({ currentTarget: { dataset: { store } } });
          } else if (res.cancel) {
            this.onNavigateToStore({ currentTarget: { dataset: { store } } });
          }
        },
      });
    }
  },

  // ── 下拉刷新 ──────────────────────────────────────────
  onPullDownRefresh() {
    this.getLocationAndLoad().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ── 分享 ──────────────────────────────────────────────
  onShareAppMessage() {
    return {
      title: 'Cure 治愈优选 — 附近门店',
      path: '/pages/store/store',
    };
  },
});
