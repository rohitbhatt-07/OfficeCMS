// Tiny migration runner: applies migrations/*.sql in name order, once each.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const env = require('../src/config/env');

async function main() {
  const clientConfig = env.DATABASE_URL
    ? {
        connectionString: env.DATABASE_URL,
        ssl: env.DB_SSL || env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_OWNER_USER || env.DB_USER,
        password: env.DB_OWNER_PASSWORD || env.DB_PASSWORD,
        ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
      };

  const client = new Client(clientConfig);
  await client.connect();

  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);

  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await client.query('SELECT name FROM schema_migrations');
  const done = new Set(rows.map((r) => r.name));

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    console.log(`Applying ${file} ...`);
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      applied++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`FAILED ${file}: ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }
  console.log(applied ? `Done. ${applied} migration(s) applied.` : 'Database is up to date.');
  await client.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
