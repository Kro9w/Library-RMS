/*
  Warnings:

  - You are about to drop the column `organizationId` on the `Campus` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `DocumentType` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Log` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `institutionId` to the `Campus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionId` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionId` to the `DocumentType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionId` to the `Log` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Campus" DROP CONSTRAINT "Campus_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentType" DROP CONSTRAINT "DocumentType_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Log" DROP CONSTRAINT "Log_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_organizationId_fkey";

-- DropIndex
DROP INDEX "public"."Document_organizationId_idx";

-- AlterTable
ALTER TABLE "Campus" DROP COLUMN "organizationId",
ADD COLUMN     "institutionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "organizationId",
ADD COLUMN     "institutionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DocumentType" DROP COLUMN "organizationId",
ADD COLUMN     "institutionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Log" DROP COLUMN "organizationId",
ADD COLUMN     "institutionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "organizationId",
ADD COLUMN     "institutionId" TEXT;

-- DropTable
DROP TABLE "public"."Organization";

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_institutionId_idx" ON "Document"("institutionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campus" ADD CONSTRAINT "Campus_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentType" ADD CONSTRAINT "DocumentType_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
