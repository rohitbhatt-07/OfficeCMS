const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { query } = require('../config/db');
const { signToken, setTokenCookie, clearTokenCookie } = require('../utils/token');
const { logAudit } = require('../utils/audit');
const HttpError = require('../utils/httpError');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const { rows } = await query(
      `SELECT u.id, u.email, u.full_name, u.password_hash, u.role_id, u.is_active,
              u.failed_login_count, u.locked_until, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );

    if (!rows.length) {
      await logAudit({ action: 'auth.login_failed', details: { email, reason: 'user_not_found' }, ip });
      return next(new HttpError(401, 'Invalid email or password'));
    }

    const user = rows[0];

    if (!user.is_active) {
      return next(new HttpError(403, 'Your account has been deactivated'));
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return next(new HttpError(423, 'Account temporarily locked due to too many failed attempts. Try again later.'));
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const failedCount = (user.failed_login_count || 0) + 1;
      let lockUntil = null;
      if (failedCount >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      }
      await query(
        `UPDATE users SET failed_login_count = $1, locked_until = $2 WHERE id = $3`,
        [failedCount, lockUntil, user.id]
      );
      await logAudit({ userId: user.id, userEmail: user.email, action: 'auth.login_failed', details: { reason: 'wrong_password' }, ip });
      return next(new HttpError(401, 'Invalid email or password'));
    }

    // Success: reset failures, update last login
    await query(
      `UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1`,
      [user.id]
    );

    // Fetch permissions
    const permResult = await query(
      `SELECT p.code FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [user.role_id]
    );
    const permissions = permResult.rows.map((r) => r.code);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role_name,
    };
    const token = signToken(tokenPayload);
    setTokenCookie(res, token);

    await logAudit({ userId: user.id, userEmail: user.email, action: 'auth.login_success', ip });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        roleId: user.role_id,
        roleName: user.role_name,
        permissions,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.full_name,
        roleId: req.user.role_id,
        roleName: req.user.role_name,
        permissions: req.user.permissions,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    clearTokenCookie(res);
    if (req.user) {
      await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'auth.logout', ip: req.ip });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { loginSchema, login, me, logout };
