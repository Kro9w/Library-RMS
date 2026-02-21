import { z } from 'zod';
import { config } from 'dotenv';
import * as path from 'path';

if (process.env.NODE_ENV === 'test') {
  config({ path: '.env.test' });
} else {
  config();
  config({ path: path.resolve(__dirname, '../../../.env') });
}

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_BUCKET_NAME: z.string().min(1).default('documents'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  CORS_ORIGINS: z
  .string()
  .default(
    'http://localhost:5173,https://localhost:5173,https://localhost:3000',
  )
  .transform((s) => s.split(',').map((origin) => origin.trim())),
});

export const env = envSchema.parse(process.env);
