/*
  Warnings:

  - You are about to drop the column `currentOwnerName` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `uploaderId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `uploaderName` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `userID` on the `Document` table. All the data in the column will be lost.
  - Added the required column `heldById` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalOwnerId` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "currentOwnerName",
DROP COLUMN "uploaderId",
DROP COLUMN "uploaderName",
DROP COLUMN "userID",
ADD COLUMN     "heldById" TEXT NOT NULL,
ADD COLUMN     "originalOwnerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_originalOwnerId_fkey" FOREIGN KEY ("originalOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_heldById_fkey" FOREIGN KEY ("heldById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
