/*
  Warnings:

  - A unique constraint covering the columns `[controlNumber]` on the table `Document` will be added. If there are existing duplicate values, this will fail.
  - The required column `controlNumber` was added to the `Document` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "controlNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Document_controlNumber_key" ON "Document"("controlNumber");
