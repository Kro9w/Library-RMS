-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "dispositionRequesterId" TEXT,
ADD COLUMN     "isUnderLegalHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legalHoldReason" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dispositionRequesterId_fkey" FOREIGN KEY ("dispositionRequesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
