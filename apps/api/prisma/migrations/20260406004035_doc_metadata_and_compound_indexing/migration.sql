-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "Document_campusId_departmentId_idx" ON "Document"("campusId", "departmentId");

-- CreateIndex
CREATE INDEX "Document_institutionId_classification_idx" ON "Document"("institutionId", "classification");
