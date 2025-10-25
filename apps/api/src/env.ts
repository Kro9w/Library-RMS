// apps/api/src/env.ts
import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().min(1),
  // CLERK_SECRET_KEY: z.string().min(1), // Removed
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);