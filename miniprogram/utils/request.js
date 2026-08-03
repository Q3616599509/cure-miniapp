/**
 * utils/request.js
 * ---------------------------------------------------------------------------
 * Unified HTTP request wrapper for the Cure mini program.
 *
 * Features:
 *   - Promise-based API with get / post / put / delete convenience methods
 *   - Auto-attaches Bearer token from local storage
 *   - Centralized error handling with user-friendly toast messages
 *   - 401 handling: clears stale token, triggers re-login, then retries the
 *     original request via a dedup queue (avoids thundering-herd on expiry)
 *   - Configurable per-call options: skipAuth, skipToast, custom headers
 *
 * All requests go through wx.request, which requires domains to be
 * whitelisted in the WeChat backend (MP settings → 开发 → 服务器域名).
 * ---------------------------------------------------------------------------
 */

const storage = require('./storage.js');

/** Storage key for the access token. */
const TOKEN_KEY = 'access_token';
/** Storage key for the refresh token (if the backend uses rotation). */
const REFRESH_TOKEN_KEY = 'refresh_token';

/* ===========================================================================
 * Internal state for 401 re-login deduplication
 * ========================================================================= */

/** Whether a re-login attempt is currently in flight. */
let isRefreshing = false;
/** Queue of callbacks waiting for the re-login result. */
let pendingQueue = [];

/**
 * Push a request onto the pending queue. It will be resolved or rejected
 * once the in-flight re-login completes.
 * @returns {Promise} Resolves/rejects when re-login finishes.
 */
function enqueueRetry() {
  return new Promise((resolve, reject) => {
    pendingQueue.push({ resolve, reject });
  });
}

/**
 * Flush the pending queue after a re-login attempt.
 * @param {boolean} success - Whether re-login succeeded.
 * @param {string} [newToken] - New token if successful.
 */
function flushQueue(success, newToken) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (success) resolve(newToken);
    else reject({ code: 401, message: '登录已过期，请重新登录' });
  });
  pendingQueue = [];
}

/* ===========================================================================
 * Core request function
 * ========================================================================= */

/**
 * Execute an HTTP request and return a Promise.
 *
 * @param {Object} options
 * @param {string} options.url    - API path (relative to base URL, e.g. '/products').
 * @param {string} [options.method='GET'] - HTTP method.
 * @param {Object} [options.data] - Request body / query params.
 * @param {Object} [options.header] - Extra headers (merged over defaults).
 * @param {boolean} [options.skipAuth=false]  - Skip attaching the Bearer token.
 * @param {boolean} [options.skipToast=false] - Suppress automatic error toasts.
 * @param {number} [options.timeout=15000]    - Request timeout in ms.
 * @param {boolean} [options._isRetry=false]  - Internal: marks a retry after re-login.
 * @returns {Promise<any>} Resolves with response data, rejects with error object.
 */
function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    skipAuth = false,
    skipToast = false,
    timeout = 15000,
    _isRetry = false,
  } = options;

  // Retrieve the app instance lazily to avoid circular-require issues
  // at module load time.
  const app = getApp();
  const baseUrl = (app && app.globalData && app.globalData.apiBase) || '';

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...header,
  };

  // Attach Bearer token unless explicitly skipped
  if (!skipAuth) {
    const token = storage.getSync(TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${url}`,
      method: method.toUpperCase(),
      data,
      header: headers,
      timeout,
      success: (res) => {
        const { statusCode, data: resData } = res;

        // ---- Success: 2xx ----
        if (statusCode >= 200 && statusCode < 300) {
          // Convention: backend wraps responses as { code, data, message }
          // If the envelope exists, unwrap it; otherwise return raw data.
          if (resData && typeof resData === 'object' && 'code' in resData) {
            if (resData.code === 0 || resData.code === 200) {
              resolve(resData.data !== undefined ? resData.data : resData);
            } else {
              const err = {
                code: resData.code,
                message: resData.message || '请求失败',
              };
              handleError(err, skipToast);
              reject(err);
            }
          } else {
            resolve(resData);
          }
          return;
        }

        // ---- 401 Unauthorized: token expired ----
        if (statusCode === 401 && !_isRetry) {
          handle401(options)
            .then((retryData) => resolve(retryData))
            .catch((err) => reject(err));
          return;
        }

        // ---- Other HTTP errors ----
        const err = {
          code: statusCode,
          message: extractErrorMessage(resData, statusCode),
        };
        handleError(err, skipToast);
        reject(err);
      },
      fail: (err) => {
        // Network-level failure (timeout, DNS, offline, etc.)
        const networkErr = {
          code: -1,
          message: '网络连接失败，请检查网络设置',
          detail: err,
        };
        handleError(networkErr, skipToast);
        reject(networkErr);
      },
    });
  });
}

/* ===========================================================================
 * 401 Re-login handler
 * ========================================================================= */

/**
 * Handle a 401 by clearing the stale token and attempting a silent WeChat
 * re-login. If another request is already re-logging-in, this one waits on
 * the queue instead of firing a duplicate wx.login.
 *
 * @param {Object} originalOptions - The options from the failed request.
 * @returns {Promise<any>} Resolves with the retried response data.
 */
function handle401(originalOptions) {
  // Clear the stale token immediately
  storage.removeSync(TOKEN_KEY);
  storage.removeSync(REFRESH_TOKEN_KEY);

  const app = getApp();
  if (app && app.globalData) {
    app.globalData.isLoggedIn = false;
  }

  // If a re-login is already in flight, wait for it
  if (isRefreshing) {
    return enqueueRetry().then(() => {
      // Retry the original request with the fresh token
      return request({ ...originalOptions, _isRetry: true });
    });
  }

  isRefreshing = true;

  // Attempt silent re-login via the auth module
  const auth = require('./auth.js');
  return auth
    .wxLogin()
    .then(() => {
      isRefreshing = false;
      flushQueue(true);
      // Retry the original request
      return request({ ...originalOptions, _isRetry: true });
    })
    .catch((err) => {
      isRefreshing = false;
      flushQueue(false);

      wx.showToast({
        title: '登录已过期，请重新登录',
        icon: 'none',
        duration: 2000,
      });

      // Redirect to personal center so the user can re-authenticate
      setTimeout(() => {
        wx.switchTab({ url: '/pages/user/user' });
      }, 1500);

      return Promise.reject({
        code: 401,
        message: '登录已过期，请重新登录',
        detail: err,
      });
    });
}

/* ===========================================================================
 * Error helpers
 * ========================================================================= */

/**
 * Extract a human-readable error message from a response body.
 * @param {any} resData - Response data from wx.request.
 * @param {number} statusCode - HTTP status code.
 * @returns {string} User-friendly error message.
 */
function extractErrorMessage(resData, statusCode) {
  // Try to pull a message from the response envelope
  if (resData && typeof resData === 'object') {
    if (resData.message) return resData.message;
    if (resData.error) return resData.error;
  }

  // Fall back to status-code-based defaults
  const statusMessages = {
    400: '请求参数有误',
    401: '登录已过期',
    403: '没有访问权限',
    404: '请求的资源不存在',
    429: '操作过于频繁，请稍后再试',
    500: '服务器开小差了',
    502: '服务暂时不可用',
    503: '服务维护中，请稍后再试',
    504: '请求超时，请重试',
  };

  return statusMessages[statusCode] || `请求失败 (${statusCode})`;
}

/**
 * Show an error toast (unless suppressed) and log to console.
 * @param {{code:number,message:string}} err - Error object.
 * @param {boolean} skipToast - Whether to suppress the toast.
 */
function handleError(err, skipToast) {
  console.error('[request]', err.code, err.message);

  if (!skipToast) {
    wx.showToast({
      title: err.message || '请求失败',
      icon: 'none',
      duration: 2000,
    });
  }
}

/* ===========================================================================
 * Convenience methods
 * ========================================================================= */

/**
 * GET request.
 * @param {string} url - API path.
 * @param {Object} [params] - Query parameters (serialized into URL).
 * @param {Object} [options] - Additional request options.
 * @returns {Promise<any>}
 */
const get = (url, params, options = {}) => {
  return request({ ...options, url, method: 'GET', data: params });
};

/**
 * POST request.
 * @param {string} url - API path.
 * @param {Object} [data] - Request body.
 * @param {Object} [options] - Additional request options.
 * @returns {Promise<any>}
 */
const post = (url, data, options = {}) => {
  return request({ ...options, url, method: 'POST', data });
};

/**
 * PUT request.
 * @param {string} url - API path.
 * @param {Object} [data] - Request body.
 * @param {Object} [options] - Additional request options.
 * @returns {Promise<any>}
 */
const put = (url, data, options = {}) => {
  return request({ ...options, url, method: 'PUT', data });
};

/**
 * DELETE request.
 * @param {string} url - API path.
 * @param {Object} [data] - Optional body / query params.
 * @param {Object} [options] - Additional request options.
 * @returns {Promise<any>}
 */
const del = (url, data, options = {}) => {
  return request({ ...options, url, method: 'DELETE', data });
};

module.exports = {
  request,
  get,
  post,
  put,
  del,
};
