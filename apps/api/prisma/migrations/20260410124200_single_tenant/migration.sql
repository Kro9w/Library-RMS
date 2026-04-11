/*
  Warnings:

  - You are about to drop the column `institutionId` on the `Campus` table. All the data in the column will be lost.
  - You are about to drop the column `institutionId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `institutionId` on the `DocumentAccess` table. All the data in the column will be lost.
  - You are about to drop the column `institutionId` on the `DocumentType` table. All the data in the column will be lost.
  - You are about to drop the column `institutionId` on the `Log` table. All the data in the column will be lost.
  - You are about to drop the column `institutionId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Institution` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Campus` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,campusId]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `DocumentType` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Campus" DROP CONSTRAINT "Campus_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentType" DROP CONSTRAINT "DocumentType_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "Log" DROP CONSTRAINT "Log_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_institutionId_fkey";

-- DropIndex
DROP INDEX "Document_institutionId_classification_idx";

-- DropIndex
DROP INDEX "Document_institutionId_idx";

-- DropIndex
DROP INDEX "DocumentAccess_institutionId_idx";

-- AlterTable
ALTER TABLE "Campus" DROP COLUMN "institutionId";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "institutionId";

-- AlterTable
ALTER TABLE "DocumentAccess" DROP COLUMN "institutionId";

-- AlterTable
ALTER TABLE "DocumentType" DROP COLUMN "institutionId";

-- AlterTable
ALTER TABLE "Log" DROP COLUMN "institutionId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "institutionId";

-- DropTable
DROP TABLE "Institution";

-- CreateIndex
CREATE UNIQUE INDEX "Campus_name_key" ON "Campus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_campusId_key" ON "Department"("name", "campusId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_name_key" ON "DocumentType"("name");
