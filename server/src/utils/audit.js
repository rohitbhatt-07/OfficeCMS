const { query } = require('../config/db');

async function logAudit({ userId = null, userEmail = null, action, resourceType = null, resourceId = null, details = {}, ip = null }) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, userEmail, action, resourceType, resourceId ? String(resourceId) : null, JSON.stringify(details), ip]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
