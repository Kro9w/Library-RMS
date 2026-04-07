import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: (process.env.DIRECT_URL || process.env.DATABASE_URL) as string,
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
