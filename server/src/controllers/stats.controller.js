const { query } = require('../config/db');

async function getStats(req, res, next) {
  try {
    const [recordsCount, activeRecordsCount, usersCount, departmentsCount, categoriesCount, recentRecords, recentActivity] =
      await Promise.all([
        query(`SELECT COUNT(*)::int AS count FROM records WHERE deleted_at IS NULL`),
        query(`SELECT COUNT(*)::int AS count FROM records WHERE deleted_at IS NULL AND status = 'active'`),
        query(`SELECT COUNT(*)::int AS count FROM users WHERE is_active = TRUE`),
        query(`SELECT COUNT(*)::int AS count FROM departments WHERE is_active = TRUE`),
        query(`SELECT COUNT(*)::int AS count FROM record_categories WHERE is_active = TRUE`),
        query(`
          SELECT r.id, r.title, r.reference_number, r.status, r.created_at,
                 c.name AS category_name, d.name AS department_name
          FROM records r
          LEFT JOIN record_categories c ON c.id = r.category_id
          LEFT JOIN departments d ON d.id = r.department_id
          WHERE r.deleted_at IS NULL
          ORDER BY r.created_at DESC
          LIMIT 5
        `),
        query(`
          SELECT a.id, a.user_email, a.action, a.resource_type, a.details, a.created_at
          FROM audit_logs a
          ORDER BY a.created_at DESC
          LIMIT 8
        `),
      ]);

    res.json({
      totalRecords: recordsCount.rows[0]?.count || 0,
      activeRecords: activeRecordsCount.rows[0]?.count || 0,
      activeUsers: usersCount.rows[0]?.count || 0,
      departments: departmentsCount.rows[0]?.count || 0,
      categories: categoriesCount.rows[0]?.count || 0,
      recentRecords: recentRecords.rows,
      recentActivity: recentActivity.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };
