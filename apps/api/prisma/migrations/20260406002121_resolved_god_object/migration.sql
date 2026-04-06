/*
  Warnings:

  - You are about to drop the column `activeRetentionDaysSnapshot` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `activeRetentionMonthsSnapshot` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `activeRetentionSnapshot` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `archiveHash` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `archiveManifestUrl` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `checkedOutById` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `dispositionActionSnapshot` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `dispositionDate` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `dispositionRequesterId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `dispositionStatus` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `inactiveRetentionDaysSnapshot` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `inactiveRetentionMonthsSnapshot` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `inactiveRetentionSnapshot` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `isCheckedOut` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `isUnderLegalHold` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `legalHoldReason` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `recordStatus` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `reviewRequesterId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Document` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_checkedOutById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_dispositionRequesterId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_reviewRequesterId_fkey";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "activeRetentionDaysSnapshot",
DROP COLUMN "activeRetentionMonthsSnapshot",
DROP COLUMN "activeRetentionSnapshot",
DROP COLUMN "archiveHash",
DROP COLUMN "archiveManifestUrl",
DROP COLUMN "checkedOutById",
DROP COLUMN "dispositionActionSnapshot",
DROP COLUMN "dispositionDate",
DROP COLUMN "dispositionRequesterId",
DROP COLUMN "dispositionStatus",
DROP COLUMN "inactiveRetentionDaysSnapshot",
DROP COLUMN "inactiveRetentionMonthsSnapshot",
DROP COLUMN "inactiveRetentionSnapshot",
DROP COLUMN "isCheckedOut",
DROP COLUMN "isUnderLegalHold",
DROP COLUMN "legalHoldReason",
DROP COLUMN "recordStatus",
DROP COLUMN "reviewRequesterId",
DROP COLUMN "status";

-- CreateTable
CREATE TABLE "DocumentLifecycle" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "activeRetentionSnapshot" INTEGER,
    "activeRetentionMonthsSnapshot" INTEGER,
    "activeRetentionDaysSnapshot" INTEGER,
    "inactiveRetentionSnapshot" INTEGER,
    "inactiveRetentionMonthsSnapshot" INTEGER,
    "inactiveRetentionDaysSnapshot" INTEGER,
    "dispositionActionSnapshot" "DispositionAction",
    "dispositionStatus" TEXT,
    "dispositionDate" TIMESTAMP(3),
    "archiveManifestUrl" TEXT,
    "archiveHash" TEXT,
    "isUnderLegalHold" BOOLEAN NOT NULL DEFAULT false,
    "legalHoldReason" TEXT,
    "dispositionRequesterId" TEXT,

    CONSTRAINT "DocumentLifecycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentWorkflow" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "status" TEXT,
    "isCheckedOut" BOOLEAN NOT NULL DEFAULT false,
    "checkedOutById" TEXT,
    "reviewRequesterId" TEXT,

    CONSTRAINT "DocumentWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentLifecycle_documentId_key" ON "DocumentLifecycle"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentWorkflow_documentId_key" ON "DocumentWorkflow"("documentId");

-- AddForeignKey
ALTER TABLE "DocumentLifecycle" ADD CONSTRAINT "DocumentLifecycle_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLifecycle" ADD CONSTRAINT "DocumentLifecycle_dispositionRequesterId_fkey" FOREIGN KEY ("dispositionRequesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentWorkflow" ADD CONSTRAINT "DocumentWorkflow_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentWorkflow" ADD CONSTRAINT "DocumentWorkflow_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentWorkflow" ADD CONSTRAINT "DocumentWorkflow_reviewRequesterId_fkey" FOREIGN KEY ("reviewRequesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
