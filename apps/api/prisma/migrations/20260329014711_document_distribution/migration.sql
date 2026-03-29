-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('PENDING', 'RECEIVED');

-- CreateTable
CREATE TABLE "DocumentDistribution" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "DistributionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentDistribution_documentId_idx" ON "DocumentDistribution"("documentId");

-- CreateIndex
CREATE INDEX "DocumentDistribution_senderId_idx" ON "DocumentDistribution"("senderId");

-- CreateIndex
CREATE INDEX "DocumentDistribution_recipientId_idx" ON "DocumentDistribution"("recipientId");

-- AddForeignKey
ALTER TABLE "DocumentDistribution" ADD CONSTRAINT "DocumentDistribution_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDistribution" ADD CONSTRAINT "DocumentDistribution_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDistribution" ADD CONSTRAINT "DocumentDistribution_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
