-- AlterTable
ALTER TABLE "DocumentLifecycle" ADD COLUMN     "dispositionMaturityDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DocumentLifecycle_dispositionMaturityDate_idx" ON "DocumentLifecycle"("dispositionMaturityDate");
