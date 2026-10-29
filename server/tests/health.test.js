import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const app = require('../src/app');
const { pool } = require('../src/config/db');

afterAll(() => pool.end());

describe('health', () => {
  it('reports database connected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('connected');
  });
  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
  });
});

describe('database', () => {
  it('has the four roles seeded', async () => {
    const { rows } = await pool.query('SELECT name FROM roles ORDER BY id');
    expect(rows.map((r) => r.name)).toEqual(['Super Admin', 'Admin', 'Staff', 'Viewer']);
  });
  it('app user cannot modify audit_logs', async () => {
    await pool.query("INSERT INTO audit_logs (action) VALUES ('test.insert')");
    await expect(pool.query("UPDATE audit_logs SET action='x'")).rejects.toThrow();
    await expect(pool.query('DELETE FROM audit_logs')).rejects.toThrow();
  });
});
