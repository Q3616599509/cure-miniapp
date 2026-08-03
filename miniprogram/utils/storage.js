/**
 * utils/storage.js
 * ---------------------------------------------------------------------------
 * Storage wrapper for WeChat Mini Program local storage.
 *
 * Provides both asynchronous (Promise-based) and synchronous APIs.
 * Sync versions are ideal for quick reads (e.g. token checks at app launch);
 * async versions are preferred for larger payloads to avoid blocking.
 *
 * All keys are namespaced with a configurable prefix to prevent collisions
 * if multiple mini programs share device storage in dev tooling.
 * ---------------------------------------------------------------------------
 */

/** Prefix applied to every key to avoid storage collisions. */
const KEY_PREFIX = 'cure_';

/**
 * Internal: apply the namespace prefix to a raw key.
 * @param {string} key - Raw storage key.
 * @returns {string} Prefixed key.
 */
const prefix = (key) => `${KEY_PREFIX}${key}`;

/* ===========================================================================
 * Asynchronous APIs (Promise-based)
 * ========================================================================= */

/**
 * Read a value from storage asynchronously.
 * @param {string} key - Storage key (without prefix).
 * @returns {Promise<any>} Resolves with the stored value, or rejects on error.
 */
const get = (key) =>
  new Promise((resolve, reject) => {
    wx.getStorage({
      key: prefix(key),
      success: (res) => resolve(res.data),
      fail: (err) => reject(err),
    });
  });

/**
 * Write a value to storage asynchronously.
 * @param {string} key - Storage key (without prefix).
 * @param {any} value - Value to persist (must be serializable).
 * @returns {Promise<void>}
 */
const set = (key, value) =>
  new Promise((resolve, reject) => {
    wx.setStorage({
      key: prefix(key),
      data: value,
      success: () => resolve(),
      fail: (err) => reject(err),
    });
  });

/**
 * Remove a single key from storage asynchronously.
 * @param {string} key - Storage key (without prefix).
 * @returns {Promise<void>}
 */
const remove = (key) =>
  new Promise((resolve, reject) => {
    wx.removeStorage({
      key: prefix(key),
      success: () => resolve(),
      fail: (err) => reject(err),
    });
  });

/**
 * Clear all keys managed by this wrapper (prefixed only).
 * NOTE: wx.clearStorage removes ALL storage for the mini program. Use with
 * caution in production; prefer removing individual keys when possible.
 * @returns {Promise<void>}
 */
const clear = () =>
  new Promise((resolve, reject) => {
    wx.clearStorage({
      success: () => resolve(),
      fail: (err) => reject(err),
    });
  });

/* ===========================================================================
 * Synchronous APIs (blocking — use sparingly for small values)
 * ========================================================================= */

/**
 * Read a value synchronously. Returns a fallback when the key is missing.
 * @param {string} key - Storage key (without prefix).
 * @param {any} [fallback=null] - Default value if key not found.
 * @returns {any} The stored value or fallback.
 */
const getSync = (key, fallback = null) => {
  try {
    const value = wx.getStorageSync(prefix(key));
    // wx.getStorageSync returns '' for missing keys
    return value === '' ? fallback : value;
  } catch (e) {
    console.warn(`[storage] getSync failed for key "${key}":`, e);
    return fallback;
  }
};

/**
 * Write a value synchronously.
 * @param {string} key - Storage key (without prefix).
 * @param {any} value - Value to persist.
 */
const setSync = (key, value) => {
  try {
    wx.setStorageSync(prefix(key), value);
  } catch (e) {
    console.error(`[storage] setSync failed for key "${key}":`, e);
  }
};

/**
 * Remove a single key synchronously.
 * @param {string} key - Storage key (without prefix).
 */
const removeSync = (key) => {
  try {
    wx.removeStorageSync(prefix(key));
  } catch (e) {
    console.error(`[storage] removeSync failed for key "${key}":`, e);
  }
};

/**
 * Clear all storage synchronously.
 */
const clearSync = () => {
  try {
    wx.clearStorageSync();
  } catch (e) {
    console.error('[storage] clearSync failed:', e);
  }
};

module.exports = {
  // Async (Promise-based)
  get,
  set,
  remove,
  clear,
  // Sync (blocking)
  getSync,
  setSync,
  removeSync,
  clearSync,
};
