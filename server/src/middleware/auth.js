const { query } = require('../config/db');
const { verifyToken } = require('../utils/token');
const HttpError = require('../utils/httpError');

async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.token;
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    if (!token) {
      return next(new HttpError(401, 'Authentication required'));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return next(new HttpError(401, 'Invalid or expired session'));
    }

    const { rows } = await query(
      `SELECT u.id, u.email, u.full_name, u.role_id, u.is_active, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (!rows.length || !rows[0].is_active) {
      return next(new HttpError(401, 'User account is inactive or not found'));
    }

    const user = rows[0];

    // Fetch permissions
    const permResult = await query(
      `SELECT p.code
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [user.role_id]
    );

    user.permissions = permResult.rows.map((r) => r.code);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required'));
    }
    if (req.user.role_name === 'Super Admin' || req.user.permissions?.includes(permissionCode)) {
      return next();
    }
    return next(new HttpError(403, `Forbidden: Missing permission '${permissionCode}'`));
  };
}

module.exports = { authenticate, requirePermission };
