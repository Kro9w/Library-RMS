-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "inTransit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intendedHolderId" TEXT;
