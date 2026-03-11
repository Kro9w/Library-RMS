/*
  Warnings:

  - You are about to drop the column `fileSize` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `fileType` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `s3Bucket` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `s3Key` on the `Document` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'FINAL');

-- DropIndex
DROP INDEX "public"."Document_s3Key_key";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "fileSize",
DROP COLUMN "fileType",
DROP COLUMN "s3Bucket",
DROP COLUMN "s3Key",
ADD COLUMN     "checkedOutById" TEXT,
ADD COLUMN     "isCheckedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recordStatus" "RecordStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "documentId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_s3Key_key" ON "DocumentVersion"("s3Key");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE INDEX "DocumentVersion_uploadedById_idx" ON "DocumentVersion"("uploadedById");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
