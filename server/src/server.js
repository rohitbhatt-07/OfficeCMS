const env = require('./config/env');
const { pool } = require('./config/db');
const app = require('./app');

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`OfficeCMS API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
