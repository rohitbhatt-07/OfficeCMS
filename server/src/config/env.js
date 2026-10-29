const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().optional().default('officecms'),
  DB_USER: z.string().optional().default('postgres'),
  DB_PASSWORD: z.string().optional().default(''),
  DB_OWNER_USER: z.string().optional(),
  DB_OWNER_PASSWORD: z.string().optional(),
  DB_SSL: z.coerce.boolean().optional().default(false),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  STORAGE_DIR: z.string().default('../storage'),
  MAX_UPLOAD_MB: z.coerce.number().default(25),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration in server/.env:');
  for (const issue of parsed.error.issues) console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

module.exports = parsed.data;
