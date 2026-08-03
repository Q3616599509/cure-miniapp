const jwt = require('jsonwebtoken');
const config = require('../config');
const { stmts } = require('../database');

// Role hierarchy: super_admin > admin > store_manager > operator
const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  store_manager: 2,
  operator: 1,
  user: 0,
};

const ROLE_LABELS = {
  super_admin: '超级管理员',
  admin: '管理员',
  store_manager: '门店经理',
  operator: '运营人员',
  user: '普通用户',
};

// Admin authentication — requires admin role or higher
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '请先登录管理后台' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = stmts.userById.get(decoded.userId);
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }
    if (user.role === 'user') {
      return res.status(403).json({ code: 403, message: '没有管理员权限' });
    }
    if (user.status === 0) {
      return res.status(403).json({ code: 403, message: '账号已被禁用' });
    }
    req.user = user;
    req.userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

// Require specific minimum role level
function requireRole(minRole) {
  const minLevel = ROLE_HIERARCHY[minRole] || 0;
  return (req, res, next) => {
    if ((ROLE_HIERARCHY[req.user.role] || 0) < minLevel) {
      return res.status(403).json({
        code: 403,
        message: `需要${ROLE_LABELS[minRole]}或更高权限`,
      });
    }
    next();
  };
}

// Admin login — verify the user has admin role
async function adminLogin(code, password) {
  // In production, use a proper admin password mechanism
  // For dev: find any admin user by openid
  const user = stmts.userByOpenid.get(code);
  if (!user || user.role === 'user') {
    return null;
  }
  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '24h' });
  return { user, token };
}

module.exports = { adminAuth, requireRole, adminLogin, ROLE_HIERARCHY, ROLE_LABELS };
