/**
 * utils/auth.js
 * ---------------------------------------------------------------------------
 * Authentication utilities for the Cure mini program.
 *
 * Responsibilities:
 *   - Token management (get / set / clear) backed by local storage
 *   - Login state checking
 *   - User info persistence & retrieval
 *   - WeChat silent login flow: wx.login → POST /v1/auth/login → store token
 *
 * The WeChat login flow is "silent" — it does not require any user interaction
 * or authorization dialog. It produces a temporary `code` that the backend
 * exchanges for an OpenID and session key via the code2Session API.
 *
 * For profile data (avatar, nickname), call wx.getUserProfile separately
 * with a user-triggered action (e.g. tapping a "登录" button).
 * ---------------------------------------------------------------------------
 */

const storage = require('./storage.js');
const { get, post } = require('./request.js');

/** Storage keys */
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_INFO_KEY = 'user_info';

/* ===========================================================================
 * Token Management
 * ========================================================================= */

/**
 * Retrieve the access token from storage.
 * @returns {string|null} The token, or null if not set.
 */
const getToken = () => storage.getSync(TOKEN_KEY, null);

/**
 * Persist the access token (and optional refresh token) to storage.
 * @param {string} token - Access token.
 * @param {string} [refreshToken] - Optional refresh token.
 */
const setToken = (token, refreshToken) => {
  storage.setSync(TOKEN_KEY, token);
  if (refreshToken) {
    storage.setSync(REFRESH_TOKEN_KEY, refreshToken);
  }
};

/**
 * Retrieve the refresh token from storage.
 * @returns {string|null}
 */
const getRefreshToken = () => storage.getSync(REFRESH_TOKEN_KEY, null);

/**
 * Clear all auth-related tokens and user info from storage.
 * Also resets the global login state.
 */
const clearToken = () => {
  storage.removeSync(TOKEN_KEY);
  storage.removeSync(REFRESH_TOKEN_KEY);
  storage.removeSync(USER_INFO_KEY);

  // Sync global data
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.isLoggedIn = false;
    app.globalData.userInfo = null;
  }
};

/* ===========================================================================
 * Login State
 * ========================================================================= */

/**
 * Check whether the user is logged in (token exists in storage).
 * @returns {boolean} True if a token is present.
 */
const isLoggedIn = () => {
  const token = getToken();
  return !!token;
};

/* ===========================================================================
 * User Info
 * ========================================================================= */

/**
 * Retrieve the cached user info object from storage.
 * @returns {Object|null} User info or null.
 */
const getUserInfo = () => storage.getSync(USER_INFO_KEY, null);

/**
 * Persist user info to storage and sync to global data.
 * @param {Object} info - User info object from backend.
 */
const setUserInfo = (info) => {
  storage.setSync(USER_INFO_KEY, info);

  const app = getApp();
  if (app && app.globalData) {
    app.globalData.userInfo = info;
    app.globalData.isLoggedIn = true;
  }
};

/**
 * Fetch fresh user info from the backend.
 * @returns {Promise<Object>} Resolves with user info.
 */
const fetchUserInfo = async () => {
  try {
    const data = await get('/auth/profile', null, { skipToast: true });
    setUserInfo(data);
    return data;
  } catch (err) {
    console.error('[auth] fetchUserInfo failed:', err);
    throw err;
  }
};

/* ===========================================================================
 * WeChat Login Flow
 * ========================================================================= */

/**
 * Perform the WeChat silent login flow:
 *   1. Call wx.login() to obtain a temporary `code`
 *   2. POST the code to /v1/auth/login on the backend
 *   3. Backend exchanges the code for OpenID via code2Session
 *   4. Backend returns { access_token, refresh_token, user }
 *   5. Persist tokens & user info, sync global state
 *
 * This flow requires no user interaction and can be called on app launch
 * or whenever the token expires (401).
 *
 * @returns {Promise<Object>} Resolves with the user object.
 */
const wxLogin = () => {
  return new Promise((resolve, reject) => {
    // Step 1: Obtain temporary login code from WeChat
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          reject({ code: -1, message: '微信登录失败：未获取到 code' });
          return;
        }

        // Step 2: Send code to backend for session exchange
        post('/auth/login', { code: loginRes.code }, { skipToast: true })
          .then((data) => {
            // Step 3: Persist tokens & user info
            // Expected response: { token, user }
            const token = data.token || data.access_token;
            if (token) {
              setToken(token, data.refresh_token);
            }
            if (data.user) {
              setUserInfo(data.user);
            }

            resolve(data.user || data);
          })
          .catch((err) => {
            console.error('[auth] Backend login failed:', err);
            reject(err);
          });
      },
      fail: (err) => {
        console.error('[auth] wx.login failed:', err);
        reject({
          code: -1,
          message: '微信登录失败，请检查网络后重试',
          detail: err,
        });
      },
    });
  });
};

/**
 * Get the user's WeChat profile (avatar + nickname).
 *
 * NOTE: wx.getUserProfile requires a user-initiated action (button tap) and
 * shows an authorization dialog. It cannot be called silently. The returned
 * profile should be synced to the backend via /v1/user/profile/update.
 *
 * @param {string} [desc='用于完善会员资料'] - Description shown in dialog.
 * @returns {Promise<Object>} Resolves with { nickName, avatarUrl, ... }.
 */
const getUserProfile = (desc = '用于完善会员资料') => {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc,
      success: (res) => {
        const { userInfo } = res;
        // Sync profile to backend (fire-and-forget)
        getApp().request({
          url: '/auth/profile',
          method: 'PUT',
          data: {
            nickname: userInfo.nickName,
            avatar: userInfo.avatarUrl,
          },
          skipToast: true,
        }).catch(() => {
          /* Non-critical: profile sync is best-effort */
        });
        resolve(userInfo);
      },
      fail: (err) => {
        reject({
          code: -1,
          message: '用户拒绝授权',
          detail: err,
        });
      },
    });
  });
};

/* ===========================================================================
 * Logout
 * ========================================================================= */

/**
 * Log the user out: notify the backend (best-effort), then clear local state.
 * @returns {Promise<void>}
 */
const logout = async () => {
  // Best-effort server-side logout
  try {
    await post('/auth/logout', {}, { skipToast: true });
  } catch (err) {
    // Even if server logout fails, clear local state
    console.warn('[auth] Server logout failed, clearing local state:', err);
  }

  clearToken();
};

module.exports = {
  // Token
  getToken,
  setToken,
  getRefreshToken,
  clearToken,
  // State
  isLoggedIn,
  // User info
  getUserInfo,
  setUserInfo,
  fetchUserInfo,
  // Login flows
  wxLogin,
  getUserProfile,
  // Logout
  logout,
};
