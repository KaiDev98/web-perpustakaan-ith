import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DB_HOST: z.string().trim().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535),
  DB_NAME: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
  DB_USER: z.string().trim().min(1),
  DB_PASSWORD: z.string().min(12),
  DB_POOL_LIMIT: z.coerce.number().int().min(1).max(50).default(10),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(5000),
  DB_READY_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(3000),
  BODY_LIMIT_BYTES: z.coerce.number().int().min(1024).max(1048576).default(65536),
  CORS_ORIGINS: z.string().default(''),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
  ENABLE_SWAGGER: z.enum(['true', 'false']).default('false'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseCorsOrigins(value: string, mode: AppEnv['NODE_ENV']): string[] {
  const origins = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS must contain valid origins');
    }
    if (parsed.origin !== origin || parsed.username || parsed.password ||
        (mode === 'production' ? parsed.protocol !== 'https:' : !['http:', 'https:'].includes(parsed.protocol))) {
      throw new Error('CORS_ORIGINS must be explicit HTTP(S) origins; production requires HTTPS');
    }
  }
  return [...new Set(origins)];
}

export function validateEnvironment(input: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(', ');
    throw new Error(`Invalid environment variables: ${names}`);
  }
  const env = result.data;
  if (env.DB_PASSWORD.startsWith('replace-with-')) {
    throw new Error('Invalid environment variables: DB_PASSWORD placeholder must be replaced');
  }
  parseCorsOrigins(env.CORS_ORIGINS, env.NODE_ENV);
  if (env.NODE_ENV === 'production' && env.ENABLE_SWAGGER === 'true') {
    throw new Error('Invalid environment variables: ENABLE_SWAGGER must be false in production');
  }
  return env;
}
