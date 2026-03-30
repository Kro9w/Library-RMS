-- CreateEnum
CREATE TYPE "TransitStatus" AS ENUM ('PENDING', 'CURRENT', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Classification" ADD VALUE 'FOR_APPROVAL';

-- AlterEnum
ALTER TYPE "RecordStatus" ADD VALUE 'IN_TRANSIT';

-- CreateTable
CREATE TABLE "DocumentTransitRoute" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL,
    "status" "TransitStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTransitRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentTransitRoute_documentId_idx" ON "DocumentTransitRoute"("documentId");

-- CreateIndex
CREATE INDEX "DocumentTransitRoute_departmentId_idx" ON "DocumentTransitRoute"("departmentId");

-- CreateIndex
CREATE INDEX "DocumentTransitRoute_approvedById_idx" ON "DocumentTransitRoute"("approvedById");

-- AddForeignKey
ALTER TABLE "DocumentTransitRoute" ADD CONSTRAINT "DocumentTransitRoute_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTransitRoute" ADD CONSTRAINT "DocumentTransitRoute_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTransitRoute" ADD CONSTRAINT "DocumentTransitRoute_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
