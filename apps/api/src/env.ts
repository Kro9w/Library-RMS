import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables!');
}

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL);