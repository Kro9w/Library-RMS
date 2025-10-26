/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedById` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `firebaseUid` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `DocumentTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Owner` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[s3Key]` on the table `Document` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownerId` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3Bucket` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3Key` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Made the column `content` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'OWNER');

-- DropForeignKey
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentTag" DROP CONSTRAINT "DocumentTag_documentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentTag" DROP CONSTRAINT "DocumentTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_documentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Owner" DROP CONSTRAINT "Owner_documentId_fkey";

-- DropIndex
DROP INDEX "public"."User_firebaseUid_key";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "fileUrl",
DROP COLUMN "organizationId",
DROP COLUMN "uploadedById",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "s3Bucket" TEXT NOT NULL,
ADD COLUMN     "s3Key" TEXT NOT NULL,
ALTER COLUMN "content" SET NOT NULL;

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "firebaseUid",
DROP COLUMN "imageUrl",
DROP COLUMN "name",
DROP COLUMN "updatedAt",
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- DropTable
DROP TABLE "public"."DocumentTag";

-- DropTable
DROP TABLE "public"."Notification";

-- DropTable
DROP TABLE "public"."Owner";

-- CreateTable
CREATE TABLE "DocumentAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DocumentToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DocumentToTag_B_index" ON "_DocumentToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Document_s3Key_key" ON "Document"("s3Key");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentToTag" ADD CONSTRAINT "_DocumentToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentToTag" ADD CONSTRAINT "_DocumentToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
