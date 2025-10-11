/*
  Warnings:

  - Added the required column `uploadedBy` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userID` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "uploadedBy" TEXT NOT NULL,
ADD COLUMN     "userID" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;
