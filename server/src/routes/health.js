const router = require('express').Router();
const { query } = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT NOW() AS time');
    res.json({ status: 'ok', database: 'connected', time: rows[0].time });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
