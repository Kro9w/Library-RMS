/*
  Warnings:

  - The values [PUBLIC,RESTRICTED] on the enum `Classification` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Classification_new" AS ENUM ('INSTITUTIONAL', 'CAMPUS', 'INTERNAL', 'CONFIDENTIAL');
ALTER TABLE "public"."Document" ALTER COLUMN "classification" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "classification" TYPE "Classification_new" USING ("classification"::text::"Classification_new");
ALTER TYPE "Classification" RENAME TO "Classification_old";
ALTER TYPE "Classification_new" RENAME TO "Classification";
DROP TYPE "public"."Classification_old";
ALTER TABLE "Document" ALTER COLUMN "classification" SET DEFAULT 'INTERNAL';
COMMIT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "campusId" TEXT,
ADD COLUMN     "departmentId" TEXT;

-- CreateIndex
CREATE INDEX "Document_campusId_idx" ON "Document"("campusId");

-- CreateIndex
CREATE INDEX "Document_departmentId_idx" ON "Document"("departmentId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
