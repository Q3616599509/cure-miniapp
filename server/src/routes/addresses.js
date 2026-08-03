const express = require('express');
const { db, stmts } = require('../database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /addresses
router.get('/', auth, (req, res) => {
  const addresses = stmts.addressesByUser.all(req.user.id);
  res.json({ code: 200, data: addresses });
});

// POST /addresses
router.post('/', auth, (req, res) => {
  const { name, phone, province, city, district, detail, is_default } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ code: 400, message: '收件人和电话不能为空' });
  }

  const count = db.prepare('SELECT COUNT(*) as c FROM addresses WHERE user_id = ?').get(req.user.id);
  if (count.c >= 20) {
    return res.status(400).json({ code: 400, message: '最多添加20个地址' });
  }

  const isDefault = is_default || count.c === 0 ? 1 : 0;

  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }

  const result = db.prepare(
    'INSERT INTO addresses (user_id, name, phone, province, city, district, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, name, phone, province || '', city || '', district || '', detail || '', isDefault);

  const address = stmts.addressById.get(result.lastInsertRowid, req.user.id);
  res.json({ code: 200, data: address });
});

// PUT /addresses/:id
router.put('/:id', auth, (req, res) => {
  const existing = stmts.addressById.get(req.params.id, req.user.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '地址不存在' });
  }

  const { name, phone, province, city, district, detail, is_default } = req.body;

  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }

  db.prepare(
    'UPDATE addresses SET name = ?, phone = ?, province = ?, city = ?, district = ?, detail = ?, is_default = ? WHERE id = ? AND user_id = ?'
  ).run(
    name || existing.name, phone || existing.phone,
    province || existing.province, city || existing.city,
    district || existing.district, detail || existing.detail,
    is_default ? 1 : existing.is_default,
    req.params.id, req.user.id
  );

  const address = stmts.addressById.get(req.params.id, req.user.id);
  res.json({ code: 200, data: address });
});

// DELETE /addresses/:id
router.delete('/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ code: 404, message: '地址不存在' });
  }
  res.json({ code: 200, message: '已删除' });
});

// PUT /addresses/:id/default
router.put('/:id/default', auth, (req, res) => {
  const existing = stmts.addressById.get(req.params.id, req.user.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '地址不存在' });
  }

  db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(req.params.id);

  res.json({ code: 200, message: '已设为默认地址' });
});

module.exports = router;
