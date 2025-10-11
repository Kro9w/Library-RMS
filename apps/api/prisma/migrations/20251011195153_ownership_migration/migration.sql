/*
  Warnings:

  - You are about to drop the column `currentOwnerId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedBy` on the `Document` table. All the data in the column will be lost.
  - Added the required column `uploaderId` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploaderName` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Made the column `currentOwnerName` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "currentOwnerId",
DROP COLUMN "uploadedBy",
ADD COLUMN     "uploaderId" TEXT NOT NULL,
ADD COLUMN     "uploaderName" TEXT NOT NULL,
ALTER COLUMN "userID" DROP DEFAULT,
ALTER COLUMN "currentOwnerName" SET NOT NULL;
