-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "activeRetentionDaysSnapshot" INTEGER,
ADD COLUMN     "activeRetentionMonthsSnapshot" INTEGER,
ADD COLUMN     "dispositionDate" TIMESTAMP(3),
ADD COLUMN     "inactiveRetentionDaysSnapshot" INTEGER,
ADD COLUMN     "inactiveRetentionMonthsSnapshot" INTEGER;

-- AlterTable
ALTER TABLE "DocumentType" ADD COLUMN     "activeRetentionDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "activeRetentionMonths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inactiveRetentionDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inactiveRetentionMonths" INTEGER NOT NULL DEFAULT 0;
