/*
  Warnings:

  - The values [CONFIDENTIAL] on the enum `Classification` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Classification_new" AS ENUM ('DEPARTMENTAL', 'INSTITUTIONAL', 'INTERNAL', 'RESTRICTED', 'FOR_APPROVAL');
ALTER TABLE "public"."Document" ALTER COLUMN "classification" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "classification" TYPE "Classification_new" USING ("classification"::text::"Classification_new");
ALTER TYPE "Classification" RENAME TO "Classification_old";
ALTER TYPE "Classification_new" RENAME TO "Classification";
DROP TYPE "public"."Classification_old";
ALTER TABLE "Document" ALTER COLUMN "classification" SET DEFAULT 'INTERNAL';
COMMIT;
