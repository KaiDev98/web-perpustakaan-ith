import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { validateEnvironment } from './src/config/env.js';

dotenv.config({ path: '../.env', quiet: true });
const env = validateEnvironment(process.env);
const url = `mysql://${encodeURIComponent(env.DB_USER)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

export default defineConfig({
  dialect: 'mysql',
  schema: './src/database/schema.ts',
  out: '../database/migrations',
  dbCredentials: { url },
});
