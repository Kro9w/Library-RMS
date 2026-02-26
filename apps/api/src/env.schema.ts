import { z } from 'zod';

export const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_BUCKET_NAME: z.string().min(1).default('FolioDocs'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    CORS_ORIGINS: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' && !data.CORS_ORIGINS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CORS_ORIGINS must be set in production',
        path: ['CORS_ORIGINS'],
      });
    }
  })
  .transform((data) => {
    const origins = data.CORS_ORIGINS
      ? data.CORS_ORIGINS.split(',').map((origin) => origin.trim())
      : data.NODE_ENV === 'production'
        ? []
        : [
            'http://localhost:5173',
            'https://localhost:5173',
            'https://localhost:3000',
          ];
    return {
      ...data,
      CORS_ORIGINS: origins,
    };
  });
