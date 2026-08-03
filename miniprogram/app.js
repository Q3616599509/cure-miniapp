/**
 * app.js — Cure (治愈优选) Mini Program Entry
 * ---------------------------------------------------------------------------
 * Handles global app lifecycle, authentication bootstrap, and shared state.
 *
 * On launch:
 *   1. Check local storage for an existing access token
 *   2. If a token exists → mark logged in, fetch fresh user info
 *   3. If no token → perform silent WeChat login (wx.login → backend)
 *   4. Fetch cart count for the tab bar badge
 *
 * Global methods exposed on the app instance:
 *   - request(options): Unified request wrapper returning full { code, data } envelope
 *   - checkLogin():  Ensures the user is authenticated; triggers login if not
 *   - isLoggedIn():  Returns boolean login state
 *   - login(nickname, avatarUrl): WeChat login with user profile
 *   - logout():  Clears auth state
 *   - getCartCount(): Fetches and updates the cart item count badge
 * ---------------------------------------------------------------------------
 */

const { get, post } = require('./utils/request.js');
const auth = require('./utils/auth.js');
const storage = require('./utils/storage.js');

// Storage key for the cart count cache
const CART_COUNT_KEY = 'cart_count';

App({
  /**
   * Global data accessible from any page via getApp().globalData.
   */
  globalData: {
    // --- User state ---
    userInfo: null,        // Cached user profile object
    isLoggedIn: false,     // Quick login-state flag
    token: '',             // Token alias (synced from auth module)

    // --- App config ---
    // 模拟器用 localhost，真机用局域网 IP（手机和电脑连同一个 WiFi）
    // onLaunch 中会根据平台自动切换
    apiBase: 'http://192.168.1.3:3001/v1',

    // --- UI state ---
    cartCount: 0,          // Cart item count (for tab bar badge)
    systemInfo: null,      // Cached wx.getSystemInfoSync result
    statusBarHeight: 20,   // Status bar height in px (for custom nav)
    navBarHeight: 44,      // Navigation bar height in px
    screenWidth: 375,      // Screen width in px

    // --- Order-now page state ---
    cart: [],              // Local cart for order-now (pickup) page
    currentStore: null,    // Selected store for order-now page
  },

  /**
   * App launch — runs once when the mini program starts.
   */
  onLaunch() {
    // Cache system info for layout calculations
    this.initSystemInfo();

    // Decide API base by platform: devtools/simulator uses localhost,
    // real devices (android/ios) use the ngrok tunnel.
    this.initApiBase();

    // Restore cached cart count for instant badge display
    const cachedCount = storage.getSync(CART_COUNT_KEY, 0);
    this.globalData.cartCount = cachedCount || 0;
    this.updateCartBadge();

    // Restore local cart for order-now page
    const cart = wx.getStorageSync('cart');
    if (cart) this.globalData.cart = cart;

    // Restore current store
    const currentStore = wx.getStorageSync('currentStore');
    if (currentStore) this.globalData.currentStore = currentStore;

    // Bootstrap authentication
    this.bootstrapAuth();
  },

  /**
   * App enters foreground (user returns from background).
   */
  onShow() {
    if (this.globalData.isLoggedIn) {
      this.getCartCount();
    }
  },

  /* ===================================================================
   * System Info
   * =================================================================== */

  initSystemInfo() {
    try {
      const sysInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = sysInfo;
      this.globalData.statusBarHeight = sysInfo.statusBarHeight || 20;
      this.globalData.screenWidth = sysInfo.screenWidth || 375;

      const isAndroid = sysInfo.platform === 'android';
      this.globalData.navBarHeight = isAndroid ? 48 : 44;
    } catch (e) {
      console.error('[app] initSystemInfo failed:', e);
    }
  },

  initApiBase() {
    try {
      const platform = (this.globalData.systemInfo && this.globalData.systemInfo.platform) ||
        wx.getSystemInfoSync().platform || '';
      const isDevtools = platform === 'devtools';
      this.globalData.apiBase = isDevtools
        ? 'http://localhost:3001/v1'
        : 'http://192.168.1.3:3001/v1';
      console.log('[app] apiBase resolved:', this.globalData.apiBase, 'platform:', platform);
    } catch (e) {
      console.error('[app] initApiBase failed:', e);
      // Keep the default ngrok address on failure.
    }
  },

  /* ===================================================================
   * Authentication Bootstrap
   * =================================================================== */

  bootstrapAuth() {
    const token = auth.getToken();

    if (token) {
      this.globalData.isLoggedIn = true;
      this.globalData.token = token;
      this.globalData.userInfo = auth.getUserInfo();

      // Fetch fresh profile (silently; 401 will auto-trigger re-login)
      auth.fetchUserInfo().catch(() => {
        /* Re-login handled by request layer on 401 */
      });
    } else {
      // No token — perform silent WeChat login
      this.silentLogin();
    }
  },

  silentLogin() {
    auth
      .wxLogin()
      .then((user) => {
        console.log('[app] Silent login successful:', user);
        this.globalData.isLoggedIn = true;
        this.globalData.token = auth.getToken();
        this.globalData.userInfo = user;
        this.getCartCount();
      })
      .catch((err) => {
        console.warn('[app] Silent login failed (non-blocking):', err);
      });
  },

  /* ===================================================================
   * Unified Request Wrapper
   * =================================================================== */

  /**
   * Unified request method — returns a Promise that resolves with the
   * FULL response envelope { code, data, message } from the backend.
   *
   * This is the primary API used by all pages:
   *   const res = await getApp().request({ url: '/products', method: 'GET' });
   *   if (res.code === 200) { ... res.data ... }
   *
   * @param {Object} options
   * @param {string} options.url - API path (relative to apiBase)
   * @param {string} [options.method='GET'] - HTTP method
   * @param {Object} [options.data] - Request body / query params
   * @param {Object} [options.header] - Extra headers
   * @param {boolean} [options.showLoading=false] - Show a loading indicator
   * @param {string} [options.loadingText='加载中'] - Loading indicator text
   * @param {boolean} [options.skipToast=false] - Suppress error toasts
   * @returns {Promise<Object>} Resolves with { code, data, message }
   */
  request(options) {
    const maxRetries = options._retry !== undefined ? options._retry : 2;
    const attempt = options._attempt || 0;

    if (options.showLoading && attempt === 0) {
      wx.showLoading({
        title: options.loadingText || '加载中',
        mask: true,
      });
    }

    return new Promise((resolve, reject) => {
      const token = auth.getToken();
      const baseUrl = this.globalData.apiBase;

      wx.request({
        url: baseUrl + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        timeout: 10000,
        header: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.header,
        },
        success: (res) => {
          if (options.showLoading) wx.hideLoading();

          if (res.statusCode === 401) {
            auth.clearToken();
            this.globalData.isLoggedIn = false;
            this.globalData.token = '';
            this.silentLogin();
            reject({ code: 401, message: '登录已过期，请重新登录' });
            return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            const msg = (res.data && res.data.message) || '请求失败';
            if (!options.skipToast && attempt >= maxRetries) {
              wx.showToast({ title: msg, icon: 'none' });
            }
            reject({ code: res.statusCode, message: msg, data: res.data });
          }
        },
        fail: (err) => {
          // Retry on network failure (up to maxRetries times)
          if (attempt < maxRetries) {
            setTimeout(() => {
              this.request({ ...options, _attempt: attempt + 1, _retry: maxRetries, skipToast: true })
                .then(resolve)
                .catch(reject);
            }, 1000 * (attempt + 1)); // 1s, 2s, 3s backoff
            return;
          }
          // Final failure
          if (options.showLoading) wx.hideLoading();
          if (!options.skipToast) {
            wx.showToast({ title: '网络连接失败', icon: 'none' });
          }
          reject({ code: -1, message: '网络连接失败，请检查网络设置', detail: err });
        },
      });
    });
  },

  /* ===================================================================
   * Auth Convenience Methods
   * =================================================================== */

  /**
   * Check if user is logged in (token exists).
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!auth.getToken();
  },

  /**
   * WeChat login with optional user profile (nickname, avatar).
   * Used by the user page login button.
   * @param {string} [nickname] - User nickname from getUserProfile
   * @param {string} [avatarUrl] - User avatar URL from getUserProfile
   * @returns {Promise<Object>} Resolves with { token, user }
   */
  async login(nickname, avatarUrl) {
    const { code } = await new Promise((resolve, reject) => {
      wx.login({ success: resolve, fail: reject });
    });

    const res = await this.request({
      url: '/auth/login',
      method: 'POST',
      data: { code, nickname, avatar_url: avatarUrl },
    });

    if (res.code === 200 && res.data) {
      auth.setToken(res.data.token);
      auth.setUserInfo(res.data.user);
      this.globalData.token = res.data.token;
      this.globalData.isLoggedIn = true;
      this.globalData.userInfo = res.data.user;
      return res.data;
    }
    throw new Error(res.message || '登录失败');
  },

  /**
   * Logout — clear all auth state.
   */
  logout() {
    auth.clearToken();
    this.globalData.token = '';
    this.globalData.isLoggedIn = false;
    this.globalData.userInfo = null;
  },

  /**
   * Ensure the user is logged in. If not, trigger silent login.
   * @returns {Promise<boolean>}
   */
  checkLogin() {
    if (this.globalData.isLoggedIn && auth.getToken()) {
      return Promise.resolve(true);
    }
    return auth.wxLogin()
      .then(() => {
        this.globalData.isLoggedIn = true;
        this.globalData.token = auth.getToken();
        return true;
      })
      .catch((err) => {
        console.error('[app] checkLogin failed:', err);
        return false;
      });
  },

  /* ===================================================================
   * Cart Methods (for order-now page local cart)
   * =================================================================== */

  /**
   * Save local cart to storage.
   */
  saveCart() {
    wx.setStorageSync('cart', this.globalData.cart);
  },

  /**
   * Get local cart item count.
   * @returns {number}
   */
  getCartItemCount() {
    return this.globalData.cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  /**
   * Get local cart total price.
   * @returns {number}
   */
  getCartTotalPrice() {
    return this.globalData.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  /* ===================================================================
   * Backend Cart Methods
   * =================================================================== */

  /**
   * Fetch the current cart item count from the backend.
   *
   * The server exposes GET /cart which returns { items, totalCount }.
   * We extract totalCount and cache it for badge / FAB display.
   *
   * @returns {Promise<number>}
   */
  getCartCount() {
    return get('/cart', null, { skipToast: true })
      .then((data) => {
        const num = Number(data?.totalCount) || 0;
        this.globalData.cartCount = num;
        storage.setSync(CART_COUNT_KEY, num);
        return num;
      })
      .catch((err) => {
        console.warn('[app] getCartCount failed:', err);
        return this.globalData.cartCount;
      });
  },

  /**
   * Update the tab bar badge to reflect the current cart count.
   *
   * NOTE: Cart is no longer a tab bar page in the current app.json
   * (tabs: 首页 / 点单 / 会员 / 我的). The cart count is tracked in
   * globalData.cartCount and displayed via the home page's floating
   * cart FAB badge. This method is kept as a no-op for backward
   * compatibility with code that still calls it.
   */
  updateCartBadge() {
    // No-op — cart is not a tab bar page.
    // Cart count is available via app.globalData.cartCount.
  },
});
