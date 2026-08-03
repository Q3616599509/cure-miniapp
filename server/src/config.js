// Server configuration — centralized and fail-fast
const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'cure-miniapp-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || './data/cure.db',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

module.exports = config;
