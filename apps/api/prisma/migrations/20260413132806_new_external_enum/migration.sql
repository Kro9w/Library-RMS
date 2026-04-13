-- AlterEnum
ALTER TYPE "Classification" ADD VALUE 'EXTERNAL';

-- CreateTable
CREATE TABLE "_DepartmentToDocumentType" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DepartmentToDocumentType_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DepartmentToDocumentType_B_index" ON "_DepartmentToDocumentType"("B");

-- AddForeignKey
ALTER TABLE "_DepartmentToDocumentType" ADD CONSTRAINT "_DepartmentToDocumentType_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToDocumentType" ADD CONSTRAINT "_DepartmentToDocumentType_B_fkey" FOREIGN KEY ("B") REFERENCES "DocumentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
