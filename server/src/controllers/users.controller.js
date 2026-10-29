const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { query } = require('../config/db');
const { logAudit } = require('../utils/audit');
const HttpError = require('../utils/httpError');

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role_id: z.coerce.number(),
  department_ids: z.array(z.coerce.number()).optional().default([]),
});

async function listUsers(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.full_name, u.role_id, u.is_active,
              u.last_login_at, u.created_at, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ORDER BY u.created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
}

async function listRoles(req, res, next) {
  try {
    const { rows } = await query(`SELECT id, name, description FROM roles ORDER BY id ASC`);
    res.json({ roles: rows });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { email, full_name, password, role_id, department_ids } = req.validated;
    const hash = await bcrypt.hash(password, 12);

    const { rows } = await query(
      `INSERT INTO users (email, full_name, password_hash, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role_id, is_active, created_at`,
      [email, full_name, hash, role_id]
    );

    const newUser = rows[0];

    // Link departments if specified
    if (department_ids && department_ids.length > 0) {
      for (const deptId of department_ids) {
        await query(
          `INSERT INTO user_departments (user_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newUser.id, deptId]
        );
      }
    }

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'user.create',
      resourceType: 'user',
      resourceId: newUser.id,
      details: { email, full_name, role_id },
      ip: req.ip,
    });

    res.status(201).json({ user: newUser });
  } catch (err) {
    if (err.code === '23505') {
      return next(new HttpError(409, 'User with this email already exists'));
    }
    next(err);
  }
}

async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return next(new HttpError(400, 'You cannot deactivate your own account'));
    }

    const { rows } = await query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, email, is_active`,
      [id]
    );

    if (!rows.length) {
      return next(new HttpError(404, 'User not found'));
    }

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: rows[0].is_active ? 'user.activate' : 'user.deactivate',
      resourceType: 'user',
      resourceId: id,
      ip: req.ip,
    });

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { createUserSchema, listUsers, listRoles, createUser, toggleUserStatus };
