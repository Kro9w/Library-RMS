/*
  Warnings:

  - Added the required column `recordsSeriesId` to the `DocumentType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentType" ADD COLUMN     "recordsSeriesId" TEXT NOT NULL,
ALTER COLUMN "activeRetentionDuration" DROP NOT NULL,
ALTER COLUMN "activeRetentionDuration" DROP DEFAULT,
ALTER COLUMN "dispositionAction" DROP NOT NULL,
ALTER COLUMN "dispositionAction" DROP DEFAULT,
ALTER COLUMN "inactiveRetentionDuration" DROP NOT NULL,
ALTER COLUMN "inactiveRetentionDuration" DROP DEFAULT,
ALTER COLUMN "activeRetentionDays" DROP NOT NULL,
ALTER COLUMN "activeRetentionDays" DROP DEFAULT,
ALTER COLUMN "activeRetentionMonths" DROP NOT NULL,
ALTER COLUMN "activeRetentionMonths" DROP DEFAULT,
ALTER COLUMN "inactiveRetentionDays" DROP NOT NULL,
ALTER COLUMN "inactiveRetentionDays" DROP DEFAULT,
ALTER COLUMN "inactiveRetentionMonths" DROP NOT NULL,
ALTER COLUMN "inactiveRetentionMonths" DROP DEFAULT;

-- CreateTable
CREATE TABLE "RecordsSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activeRetentionDuration" INTEGER NOT NULL DEFAULT 0,
    "activeRetentionMonths" INTEGER NOT NULL DEFAULT 0,
    "activeRetentionDays" INTEGER NOT NULL DEFAULT 0,
    "inactiveRetentionDuration" INTEGER NOT NULL DEFAULT 0,
    "inactiveRetentionMonths" INTEGER NOT NULL DEFAULT 0,
    "inactiveRetentionDays" INTEGER NOT NULL DEFAULT 0,
    "dispositionAction" "DispositionAction" NOT NULL DEFAULT 'ARCHIVE',

    CONSTRAINT "RecordsSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecordsSeries_name_key" ON "RecordsSeries"("name");

-- AddForeignKey
ALTER TABLE "DocumentType" ADD CONSTRAINT "DocumentType_recordsSeriesId_fkey" FOREIGN KEY ("recordsSeriesId") REFERENCES "RecordsSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
