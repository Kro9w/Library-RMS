/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `_DocumentToTag` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `organizationId` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedById` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_DocumentToTag" DROP CONSTRAINT "_DocumentToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_DocumentToTag" DROP CONSTRAINT "_DocumentToTag_B_fkey";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "ownerId",
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "uploadedById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "displayName",
ADD COLUMN     "name" TEXT;

-- DropTable
DROP TABLE "public"."_DocumentToTag";

-- CreateTable
CREATE TABLE "DocumentTag" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "DocumentTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTag_documentId_tagId_key" ON "DocumentTag"("documentId", "tagId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTag" ADD CONSTRAINT "DocumentTag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTag" ADD CONSTRAINT "DocumentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
