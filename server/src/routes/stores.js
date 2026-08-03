const express = require('express');
const { db } = require('../database');

const router = express.Router();

// GET /stores
router.get('/', (req, res) => {
  const { lat, lng } = req.query;
  let stores = db.prepare('SELECT * FROM stores WHERE status = 1').all();

  // Calculate distance using Haversine formula (in meters)
  if (lat && lng) {
    stores = stores.map(s => {
      const R = 6371000; // Earth's radius in meters
      const toRad = deg => deg * Math.PI / 180;
      const dLat = toRad(s.latitude - parseFloat(lat));
      const dLng = toRad(s.longitude - parseFloat(lng));
      const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(parseFloat(lat))) * Math.cos(toRad(s.latitude))
        * Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...s, distance: Math.round(R * c) };
    }).sort((a, b) => a.distance - b.distance);
  }

  res.json({ code: 200, data: stores });
});

// GET /stores/:id
router.get('/:id', (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) {
    return res.status(404).json({ code: 404, message: '门店不存在' });
  }
  res.json({ code: 200, data: store });
});

module.exports = router;
