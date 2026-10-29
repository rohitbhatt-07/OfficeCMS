const { Pool } = require('pg');
const env = require('./env');

const poolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl: env.DB_SSL || env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
      max: 10,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => console.error('Unexpected PostgreSQL error:', err.message));

// Always pass user input as $1, $2 ... parameters, never by string concatenation.
const query = (text, params) => pool.query(text, params);

// Run several queries as one all-or-nothing transaction.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
