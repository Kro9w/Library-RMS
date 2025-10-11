/*
  Warnings:

  - Made the column `userID` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "uploadedBy" SET DEFAULT 'legacy_upload',
ALTER COLUMN "userID" SET NOT NULL,
ALTER COLUMN "userID" SET DEFAULT 'legacy_user';
