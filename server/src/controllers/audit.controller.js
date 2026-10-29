const { query } = require('../config/db');

async function listAuditLogs(req, res, next) {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const { rows } = await query(
      `SELECT a.id, a.user_id, a.user_email, a.action, a.resource_type,
              a.resource_id, a.details, a.ip_address, a.created_at
       FROM audit_logs a
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [Number(limit), Number(offset)]
    );
    res.json({ logs: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAuditLogs };
