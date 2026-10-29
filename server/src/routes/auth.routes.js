const express = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { loginSchema, login, me, logout } = require('../controllers/auth.controller');

const router = express.Router();

// Strict rate limit for login attempts (5 attempts per minute per IP)
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  message: { error: 'Too many login attempts, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

module.exports = router;
