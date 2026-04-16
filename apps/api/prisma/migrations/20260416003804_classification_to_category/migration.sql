/*
  Warnings:

  - You are about to drop the column `classification` on the `Document` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Category" AS ENUM ('DEPARTMENTAL', 'INSTITUTIONAL', 'INTERNAL', 'RESTRICTED', 'FOR_APPROVAL', 'EXTERNAL');

-- DropIndex
DROP INDEX "Document_classification_idx";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "classification",
ADD COLUMN     "category" "Category" NOT NULL DEFAULT 'INTERNAL';

-- DropEnum
DROP TYPE "Classification";

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");
