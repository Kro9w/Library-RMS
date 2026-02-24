import { config } from 'dotenv';
import * as path from 'path';
import { envSchema } from './env.schema';

if (process.env.NODE_ENV === 'test') {
  config({ path: '.env.test' });
} else {
  config();
  config({ path: path.resolve(__dirname, '../../../.env') });
}

export const env = envSchema.parse(process.env);
