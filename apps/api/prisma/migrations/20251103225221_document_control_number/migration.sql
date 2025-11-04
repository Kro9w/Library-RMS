/*
  Warnings:

  - Added the required column `fileName` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "controlNumber" TEXT,
ADD COLUMN     "fileName" TEXT NOT NULL;
