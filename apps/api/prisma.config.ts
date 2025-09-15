import { defineConfig } from 'prisma-config';
import path from 'path';

export default defineConfig({
  // Use path.join with __dirname to create a reliable, absolute path
  // to your schema file. This prevents any duplication issues.
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  
  // You can also add other configurations here if needed
  // datasourceUrl: process.env.DATABASE_URL,
});
