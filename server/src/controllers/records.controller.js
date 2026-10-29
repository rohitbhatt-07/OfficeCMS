const { z } = require('zod');
const { query } = require('../config/db');
const { logAudit } = require('../utils/audit');
const HttpError = require('../utils/httpError');

const recordSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  category_id: z.coerce.number().optional().nullable(),
  department_id: z.coerce.number().optional().nullable(),
  reference_number: z.string().optional().nullable(),
  record_date: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'archived', 'closed']).default('active'),
  custom_fields: z.record(z.any()).optional().default({}),
});

async function listRecords(req, res, next) {
  try {
    const { q, category_id, department_id, status, limit = 50, offset = 0 } = req.query;

    const conditions = ['r.deleted_at IS NULL'];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      const pIdx = params.length;
      conditions.push(`(r.title ILIKE $${pIdx} OR r.reference_number ILIKE $${pIdx} OR r.description ILIKE $${pIdx})`);
    }

    if (category_id) {
      params.push(Number(category_id));
      conditions.push(`r.category_id = $${params.length}`);
    }

    if (department_id) {
      params.push(Number(department_id));
      conditions.push(`r.department_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    // Total count query
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM records r WHERE ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    // List query with joins
    params.push(Number(limit));
    const limitIdx = params.length;
    params.push(Number(offset));
    const offsetIdx = params.length;

    const sql = `
      SELECT r.id, r.title, r.description, r.notes, r.reference_number, r.record_date,
             r.status, r.custom_fields, r.created_at, r.updated_at,
             c.name AS category_name, c.id AS category_id,
             d.name AS department_name, d.id AS department_id,
             u.full_name AS created_by_name
      FROM records r
      LEFT JOIN record_categories c ON c.id = r.category_id
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN users u ON u.id = r.created_by
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const { rows } = await query(sql, params);

    res.json({
      records: rows,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (err) {
    next(err);
  }
}

async function getRecordById(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT r.*,
              c.name AS category_name,
              d.name AS department_name,
              u.full_name AS created_by_name,
              uu.full_name AS updated_by_name
       FROM records r
       LEFT JOIN record_categories c ON c.id = r.category_id
       LEFT JOIN departments d ON d.id = r.department_id
       LEFT JOIN users u ON u.id = r.created_by
       LEFT JOIN users uu ON uu.id = r.updated_by
       WHERE r.id = $1 AND r.deleted_at IS NULL`,
      [id]
    );

    if (!rows.length) {
      return next(new HttpError(404, 'Record not found'));
    }

    res.json({ record: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function createRecord(req, res, next) {
  try {
    const data = req.validated;
    const userId = req.user.id;

    // Auto-generate reference number if not provided
    let refNum = data.reference_number;
    if (!refNum || !refNum.trim()) {
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      refNum = `REC-${datePart}-${randomSuffix}`;
    }

    const { rows } = await query(
      `INSERT INTO records (
        title, description, notes, category_id, department_id,
        reference_number, record_date, status, custom_fields, created_by, updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       RETURNING *`,
      [
        data.title,
        data.description || null,
        data.notes || null,
        data.category_id || null,
        data.department_id || null,
        refNum,
        data.record_date || new Date().toISOString().slice(0, 10),
        data.status,
        JSON.stringify(data.custom_fields || {}),
        userId,
      ]
    );

    const record = rows[0];

    await logAudit({
      userId,
      userEmail: req.user.email,
      action: 'record.create',
      resourceType: 'record',
      resourceId: record.id,
      details: { title: record.title, reference_number: record.reference_number },
      ip: req.ip,
    });

    res.status(201).json({ success: true, record });
  } catch (err) {
    next(err);
  }
}

async function updateRecord(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.validated;
    const userId = req.user.id;

    const { rows } = await query(
      `UPDATE records
       SET title = $1, description = $2, notes = $3, category_id = $4,
           department_id = $5, reference_number = $6, record_date = $7,
           status = $8, custom_fields = $9, updated_by = $10, updated_at = NOW()
       WHERE id = $11 AND deleted_at IS NULL
       RETURNING *`,
      [
        data.title,
        data.description || null,
        data.notes || null,
        data.category_id || null,
        data.department_id || null,
        data.reference_number || null,
        data.record_date || null,
        data.status,
        JSON.stringify(data.custom_fields || {}),
        userId,
        id,
      ]
    );

    if (!rows.length) {
      return next(new HttpError(404, 'Record not found'));
    }

    const record = rows[0];

    await logAudit({
      userId,
      userEmail: req.user.email,
      action: 'record.update',
      resourceType: 'record',
      resourceId: record.id,
      details: { title: record.title },
      ip: req.ip,
    });

    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
}

async function deleteRecord(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { rows } = await query(
      `UPDATE records SET deleted_at = NOW(), updated_by = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, title`,
      [userId, id]
    );

    if (!rows.length) {
      return next(new HttpError(404, 'Record not found'));
    }

    await logAudit({
      userId,
      userEmail: req.user.email,
      action: 'record.delete',
      resourceType: 'record',
      resourceId: id,
      details: { title: rows[0].title },
      ip: req.ip,
    });

    res.json({ success: true, message: 'Record deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordSchema,
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
};
