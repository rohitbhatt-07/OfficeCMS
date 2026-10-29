const bcrypt = require('bcryptjs');
const env = require('./config/env');
const { pool } = require('./config/db');
const app = require('./app');

async function autoSeedAdmin() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    if (rows[0].count === 0) {
      const hash = await bcrypt.hash('Rohitbhatt@12', 12);
      await pool.query(
        `INSERT INTO users (email, full_name, password_hash, role_id)
         VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = 'Super Admin'))
         ON CONFLICT DO NOTHING`,
        ['rohitbhatt0704@gmail.com', 'Rohit Bhatt', hash]
      );
      console.log('Default Super Admin automatically provisioned: rohitbhatt0704@gmail.com');
    }
  } catch (err) {
    console.error('Auto-seed check failed:', err.message);
  }
}

const server = app.listen(env.PORT, env.HOST, async () => {
  console.log(`OfficeCMS API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  await autoSeedAdmin();
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
