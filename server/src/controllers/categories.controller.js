const { z } = require('zod');
const { query } = require('../config/db');
const { logAudit } = require('../utils/audit');
const HttpError = require('../utils/httpError');

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

async function listCategories(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name, c.description, c.is_active, c.created_at,
              COUNT(r.id)::int AS record_count
       FROM record_categories c
       LEFT JOIN records r ON r.category_id = c.id AND r.deleted_at IS NULL
       GROUP BY c.id
       ORDER BY c.name ASC`
    );
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, description, is_active } = req.validated;
    const { rows } = await query(
      `INSERT INTO record_categories (name, description, is_active) VALUES ($1, $2, $3) RETURNING *`,
      [name, description || null, is_active]
    );
    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'category.create',
      resourceType: 'category',
      resourceId: rows[0].id,
      details: { name },
      ip: req.ip,
    });
    res.status(201).json({ category: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return next(new HttpError(409, 'Category with this name already exists'));
    }
    next(err);
  }
}

module.exports = { categorySchema, listCategories, createCategory };
