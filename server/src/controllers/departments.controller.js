const { z } = require('zod');
const { query } = require('../config/db');
const { logAudit } = require('../utils/audit');
const HttpError = require('../utils/httpError');

const deptSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  is_active: z.boolean().default(true),
});

async function listDepartments(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT d.id, d.name, d.is_active, d.created_at,
              COUNT(r.id)::int AS record_count
       FROM departments d
       LEFT JOIN records r ON r.department_id = d.id AND r.deleted_at IS NULL
       GROUP BY d.id
       ORDER BY d.name ASC`
    );
    res.json({ departments: rows });
  } catch (err) {
    next(err);
  }
}

async function createDepartment(req, res, next) {
  try {
    const { name, is_active } = req.validated;
    const { rows } = await query(
      `INSERT INTO departments (name, is_active) VALUES ($1, $2) RETURNING *`,
      [name, is_active]
    );
    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'department.create',
      resourceType: 'department',
      resourceId: rows[0].id,
      details: { name },
      ip: req.ip,
    });
    res.status(201).json({ department: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return next(new HttpError(409, 'Department with this name already exists'));
    }
    next(err);
  }
}

module.exports = { deptSchema, listDepartments, createDepartment };
