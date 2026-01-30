-- CreateEnum
CREATE TYPE "DispositionAction" AS ENUM ('ARCHIVE', 'DESTROY');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "activeRetentionSnapshot" INTEGER,
ADD COLUMN     "dispositionActionSnapshot" "DispositionAction",
ADD COLUMN     "dispositionStatus" TEXT,
ADD COLUMN     "inactiveRetentionSnapshot" INTEGER;

-- AlterTable
ALTER TABLE "DocumentType" ADD COLUMN     "activeRetentionDuration" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dispositionAction" "DispositionAction" NOT NULL DEFAULT 'ARCHIVE',
ADD COLUMN     "inactiveRetentionDuration" INTEGER NOT NULL DEFAULT 0;
