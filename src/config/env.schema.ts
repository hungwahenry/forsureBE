import { z } from 'zod';

const durationString = z
  .string()
  .regex(/^\d+(ms|s|m|h|d)$/, 'expected a duration like "15m" or "30d"');

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),

    APP_PUBLIC_URL: z.url(),

    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),

    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_ACCESS_TTL: durationString.default('15m'),
    JWT_REFRESH_TTL: durationString.default('30d'),

    CORS_ORIGINS: z
      .string()
      .transform((v) =>
        v
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      ),

    // --- Email (Resend) ---
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.email(),
    RESEND_FROM_NAME: z.string().default('forsure'),

    // --- Storage ---
    STORAGE_DRIVER: z.enum(['s3', 'local']).default('local'),

    // Local driver
    LOCAL_STORAGE_DIR: z.string().default('./uploads'),
    LOCAL_PUBLIC_URL: z.url().optional(),

    // S3-compatible driver (R2, AWS, B2, Spaces, MinIO, ...)
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_URL: z.url().optional(),

    // Places (search/autocomplete via Google Places New) ---
    GOOGLE_PLACES_API_KEY: z.string().min(1),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === 's3') {
      const required = [
        'S3_ENDPOINT',
        'S3_REGION',
        'S3_BUCKET',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
        'S3_PUBLIC_URL',
      ] as const;
      for (const key of required) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when STORAGE_DRIVER=s3`,
          });
        }
      }
    }
    if (env.STORAGE_DRIVER === 'local' && !env.LOCAL_PUBLIC_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['LOCAL_PUBLIC_URL'],
        message: 'LOCAL_PUBLIC_URL is required when STORAGE_DRIVER=local',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
