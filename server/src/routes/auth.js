const express = require('express');
const { stmts } = require('../database');
const { auth, generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /auth/login — WeChat login
router.post('/login', (req, res) => {
  const { code, nickname, avatar_url } = req.body;

  // In production, exchange code for openid via WeChat API
  // For development, use mock openid
  const openid = code || `mock_openid_${Date.now()}`;

  let user = stmts.userByOpenid.get(openid);
  if (!user) {
    const result = stmts.createUser.run(openid, nickname || 'Cure用户', avatar_url || '');
    user = stmts.userByOpenid.get(openid);
  } else if (nickname || avatar_url) {
    stmts.updateUser.run(
      nickname || user.nickname,
      avatar_url || user.avatar_url,
      user.id
    );
    user = stmts.userByOpenid.get(openid);
  }

  const token = generateToken(user.id);
  res.json({
    code: 200,
    data: {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        phone: user.phone,
        balance: user.balance,
        points: user.points,
        growth: user.growth,
        level: user.level,
      },
    },
  });
});

// GET /auth/profile
router.get('/profile', auth, (req, res) => {
  res.json({ code: 200, data: req.user });
});

// PUT /auth/profile
router.put('/profile', auth, (req, res) => {
  const { nickname, avatar_url } = req.body;
  stmts.updateUser.run(
    nickname || req.user.nickname,
    avatar_url || req.user.avatar_url,
    req.user.id
  );
  const user = stmts.userById.get(req.user.id);
  res.json({ code: 200, data: user });
});

// POST /auth/phone — bind phone number
router.post('/phone', auth, (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ code: 400, message: '手机号不能为空' });
  }
  stmts.updatePhone.run(phone, req.user.id);
  const user = stmts.userById.get(req.user.id);
  res.json({ code: 200, data: user });
});

module.exports = router;
