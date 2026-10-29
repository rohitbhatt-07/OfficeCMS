// Creates the first Super Admin. Usage:
//   node scripts/seed-admin.js --email you@office.com --name "Your Name" --password "LongPassword123!"
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { pool } = require('../src/config/db');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

async function main() {
  const parsed = schema.safeParse({ email: arg('email'), name: arg('name'), password: arg('password') });
  if (!parsed.success) {
    console.error(parsed.error.issues.map((i) => `- ${i.path}: ${i.message}`).join('\n'));
    process.exit(1);
  }
  const { email, name, password } = parsed.data;
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (email, full_name, password_hash, role_id)
     VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = 'Super Admin'))
     ON CONFLICT DO NOTHING RETURNING id`,
    [email, name, hash]
  );
  console.log(rows.length ? `Super Admin created (id ${rows[0].id}).` : 'A user with that email already exists.');
  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
