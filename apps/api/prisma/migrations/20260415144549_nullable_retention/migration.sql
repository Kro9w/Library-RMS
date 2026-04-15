-- AlterTable
ALTER TABLE "RecordsSeries" ALTER COLUMN "activeRetentionDuration" DROP NOT NULL,
ALTER COLUMN "activeRetentionMonths" DROP NOT NULL,
ALTER COLUMN "activeRetentionDays" DROP NOT NULL,
ALTER COLUMN "inactiveRetentionDuration" DROP NOT NULL,
ALTER COLUMN "inactiveRetentionMonths" DROP NOT NULL,
ALTER COLUMN "inactiveRetentionDays" DROP NOT NULL,
ALTER COLUMN "dispositionAction" DROP NOT NULL;
