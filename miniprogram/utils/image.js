/**
 * utils/image.js — 图片 URL 工具
 * 用于统一处理商品图片，把国内加载不了的 Unsplash 链接换成本地占位图
 * 同时处理后端上传图片的相对路径，自动拼接完整 URL
 */

const PLACEHOLDER = '/assets/product-placeholder.png';

/**
 * 获取后端服务基础地址（去掉 /v1 后缀）
 */
function getServerBase() {
  const app = getApp();
  if (app && app.globalData && app.globalData.apiBase) {
    // apiBase 形如 'http://localhost:3001/v1'
    return app.globalData.apiBase.replace(/\/v1\/?$/, '');
  }
  return '';
}

/**
 * 替换数组中所有 Unsplash 链接为本地占位图
 * 同时把后端相对路径（/uploads/xxx.jpg）拼接为完整 URL
 * @param {string[]} urls
 * @returns {string[]}
 */
function sanitizeUrls(urls) {
  if (!urls || !urls.length) return [PLACEHOLDER];
  const serverBase = getServerBase();
  return urls.map((url) => {
    if (!url || url.indexOf('unsplash.com') !== -1) return PLACEHOLDER;
    // 后端上传的图片，路径形如 /uploads/xxx.jpg，拼接完整 URL
    if (url.startsWith('/uploads/') && serverBase) {
      return serverBase + url;
    }
    return url;
  });
}

/**
 * 处理单个 URL（用于 product.image 这种单个字段）
 */
function sanitizeUrl(url) {
  if (!url || url.indexOf('unsplash.com') !== -1) return PLACEHOLDER;
  const serverBase = getServerBase();
  if (url && url.startsWith('/uploads/') && serverBase) {
    return serverBase + url;
  }
  return url || PLACEHOLDER;
}

/**
 * 处理商品对象，把 images/image 字段替换成本地占位图
 * 返回新对象（不修改原对象）
 */
function sanitizeProduct(p) {
  if (!p) return p;
  const copy = Object.assign({}, p);
  if (copy.images && copy.images.length > 0) {
    copy.images = sanitizeUrls(copy.images);
  } else {
    copy.images = [PLACEHOLDER];
  }
  if (copy.image !== undefined) {
    copy.image = sanitizeUrl(copy.image);
  }
  return copy;
}

/**
 * 处理数组中的每个商品
 */
function sanitizeProducts(list) {
  if (!list || !list.length) return [];
  return list.map(sanitizeProduct);
}

module.exports = {
  PLACEHOLDER,
  sanitizeUrl,
  sanitizeUrls,
  sanitizeProduct,
  sanitizeProducts,
};