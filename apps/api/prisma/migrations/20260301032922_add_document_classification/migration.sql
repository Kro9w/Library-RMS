-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "classification" "Classification" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "originalSenderId" TEXT;

-- CreateIndex
CREATE INDEX "Document_classification_idx" ON "Document"("classification");

-- CreateIndex
CREATE INDEX "Document_originalSenderId_idx" ON "Document"("originalSenderId");
