// utils/util.js — Common utility functions

/**
 * Format price to 2 decimal places
 */
function formatPrice(price) {
  if (price === null || price === undefined) return '0.00';
  return Number(price).toFixed(2);
}

/**
 * Format price into integer and decimal parts
 */
function splitPrice(price) {
  const str = formatPrice(price);
  const [intPart, decPart] = str.split('.');
  return { integer: intPart, decimal: decPart };
}

/**
 * Format sales number (e.g. 3280 → "3280", 12340 → "1.2万")
 */
function formatSales(sales) {
  if (sales >= 10000) {
    return (sales / 10000).toFixed(1) + '万';
  }
  return String(sales);
}

/**
 * Format distance (meters → "800m" or "1.2km")
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return meters + 'm';
  }
  return (meters / 1000).toFixed(1) + 'km';
}

/**
 * Format datetime string to readable format
 */
function formatDate(dateStr, fmt = 'YYYY-MM-DD HH:mm') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return fmt
    .replace('YYYY', d.getFullYear())
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()));
}

/**
 * Relative time (e.g. "3分钟前", "2小时前", "昨天", "3天前")
 */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return formatDate(dateStr, 'MM-DD HH:mm');
}

/**
 * Validate phone number (Chinese mobile)
 */
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * Debounce
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle
 */
function throttle(fn, interval = 300) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Show toast (promise wrapper)
 */
function showToast(title, icon = 'none', duration = 2000) {
  return new Promise((resolve) => {
    wx.showToast({ title, icon, duration, mask: true, success: () => resolve() });
  });
}

/**
 * Show modal (promise wrapper)
 */
function showModal(options) {
  return new Promise((resolve) => {
    wx.showModal({
      ...options,
      success: (res) => resolve(res),
    });
  });
}

module.exports = {
  formatPrice,
  splitPrice,
  formatSales,
  formatDistance,
  formatDate,
  timeAgo,
  isValidPhone,
  debounce,
  throttle,
  showToast,
  showModal,
};
