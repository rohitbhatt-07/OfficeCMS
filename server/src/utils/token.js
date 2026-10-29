const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function setTokenCookie(res, token) {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });
}

function clearTokenCookie(res) {
  res.clearCookie('token');
}

module.exports = { signToken, verifyToken, setTokenCookie, clearTokenCookie };
